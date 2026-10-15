#!/usr/bin/env python3
"""Browser integration checks. All storage fixtures live in disposable test contexts."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
import shutil
import threading
import time
from urllib.parse import urlsplit

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-results"
KEY = "medical-rp:profile:v1"
GAMES = ["intern", "paramedic", "feldsher", "narcologist", "pediatrician", "therapist", "traumatologist", "surgeon"]
LANDSCAPE = {"paramedic", "feldsher", "traumatologist", "surgeon"}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def static_site(base_url):
    if base_url:
        yield base_url.rstrip("/") + "/"
        return
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        thread.join(timeout=3)
        server.server_close()


def profile(page):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", KEY)


def assert_no_overflow(page):
    width = page.evaluate("({client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth})")
    assert width["scroll"] <= width["client"] + 2, f"Horizontal overflow: {width}"


def launch(page, game_id, difficulty="easy"):
    page.get_by_test_id(f"game-card-{game_id}").click()
    radio = page.get_by_test_id("difficulty").locator(f"input[value='{difficulty}']")
    if radio.count():
        radio.check()
    else:
        choices = page.locator(f"input[name='difficulty'][value='{difficulty}']")
        if choices.count():
            choices.check()
        else:
            page.get_by_test_id("difficulty").select_option(difficulty)
    page.get_by_test_id("launch-mission").click()
    expect(page.get_by_test_id("game-root").locator(".game-shell")).to_be_visible(timeout=20000)
    page.wait_for_function("key => !!JSON.parse(localStorage.getItem(key))?.active?.state", arg=KEY)


def resume(page):
    if page.get_by_test_id("game-root").locator(".game-shell").is_visible():
        return
    page.get_by_test_id("resume-mission").click()
    expect(page.get_by_test_id("game-root").locator(".game-shell")).to_be_visible(timeout=20000)


def instrument(page, tool, target):
    # Both supported input paths are tested: drag the thermometer, tap the others.
    button = page.locator(f"[data-tool='{tool}']")
    region = page.locator(f"[data-target='{target}']")
    if tool == "temp":
        button.scroll_into_view_if_needed()
        a, b = button.bounding_box(), region.bounding_box()
        assert a and b
        page.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
        page.mouse.down()
        page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=12)
        page.mouse.up()
    else:
        button.click()
        if tool == "bp":
            # Regression: global :active transforms must not displace absolute
            # scene targets between pointerdown and pointerup.
            region.hover()
            before = region.bounding_box()
            page.mouse.down()
            page.wait_for_timeout(230)
            during = region.bounding_box()
            page.mouse.up()
            assert before and during and abs(before["x"] - during["x"]) < 1 and abs(before["y"] - during["y"]) < 1, f"Target moved on pointerdown: {before} → {during}"
        else:
            region.click()
    expect(page.locator(".procedure-panel")).to_be_visible()


def complete_intern_patient(page):
    page.get_by_role("button", name="↗ Изучить карту и жалобы", exact=True).click()
    note = page.locator(".intake-card p").inner_text()
    error = "Возраст" if "возраст" in note else "Браслет" if "Браслет" in note else "Жалоба"
    page.locator(".intake-card").get_by_role("button", name=error, exact=True).click()
    name = page.locator(".patient-nameplate strong").inner_text().split(",")[0]
    instrument(page, "temp", "head")
    hold = page.get_by_role("button", name="Удерживать датчик", exact=True)
    hold.hover()
    page.mouse.down()
    page.wait_for_timeout(2650)
    page.mouse.up()
    expect(page.locator("[data-tool='temp']")).to_be_disabled()
    instrument(page, "bp", "arm")
    for _ in range(4):
        page.get_by_role("button", name="◉ Накачать +18", exact=True).click()
    page.get_by_role("button", name="Зафиксировать", exact=True).click()
    expect(page.locator("[data-tool='bp']")).to_be_disabled()
    instrument(page, "pulse", "chest")
    for _ in range(3):
        page.wait_for_function("() => { const m=document.querySelector('.pulse-track i'); return m && parseFloat(m.style.left)>43 && parseFloat(m.style.left)<57; }", timeout=10000)
        page.get_by_role("button", name="♥ Поймать импульс", exact=True).click()
        if page.locator(".pulse-track i").count():
            page.wait_for_function("() => { const m=document.querySelector('.pulse-track i'); return !m || parseFloat(m.style.left)<30 || parseFloat(m.style.left)>70; }")
    expect(page.locator("[data-tool='pulse']")).to_be_disabled()
    urgent = {"Лея", "Лев", "Даниил", "Олег"}
    soon = {"Арина", "Илья", "Ева"}
    priority = 1 if name in urgent else 2 if name in soon else 3
    page.locator(f"[data-priority='{priority}']").click()
    page.get_by_role("button", name="Передать пациента врачу →", exact=True).click()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", help="Test an existing static server instead of launching one")
    parser.add_argument("--chromium", help="Chromium executable; defaults to installed system Chromium or Playwright")
    args = parser.parse_args()
    OUTPUT.mkdir(exist_ok=True)
    errors, checks = [], []
    def record(message):
        checks.append(message)
        print(f"PASS {message}", flush=True)
    started = time.monotonic()

    with static_site(args.base_url) as url, sync_playwright() as playwright:
        executable = args.chromium or shutil.which("chromium") or shutil.which("chromium-browser")
        browser = playwright.chromium.launch(executable_path=executable, headless=True, args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])

        def new_page(label, mobile=False, landscape=False):
            context = browser.new_context(viewport={"width": 844 if landscape else 390 if mobile else 1440, "height": 390 if landscape else 844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
            page = context.new_page()
            page.set_default_timeout(12000)
            page.on("pageerror", lambda error: errors.append(f"{label}: {error}"))
            page.on("console", lambda message: errors.append(f"{label} console: {message.text}") if message.type == "error" else None)
            page.on("response", lambda response: errors.append(f"{label} HTTP {response.status}: {response.url}") if response.status >= 400 else None)
            page.on("request", lambda request: errors.append(f"{label} external runtime request: {request.url}") if request.url.startswith(("https://", "http://")) and urlsplit(request.url).netloc != urlsplit(url).netloc else None)
            page.goto(url, wait_until="networkidle")
            return context, page

        try:
            for mobile in (False, True):
                label = "mobile" if mobile else "desktop"
                context, page = new_page(label, mobile)
                for game in GAMES:
                    expect(page.get_by_test_id(f"game-card-{game}")).to_be_visible()
                assert_no_overflow(page)
                page.screenshot(path=str(OUTPUT / f"{label}-dashboard.png"), full_page=True)
                for nav in ("profile", "shop", "settings"):
                    navigation_name = "Мобильная навигация" if mobile else "Параметры" if nav == "settings" else "Основная навигация"
                    navigation = page.get_by_role("navigation", name=navigation_name, exact=True)
                    navigation.get_by_test_id(f"nav-{nav}").click()
                    # The navigation must expose actual content, not an empty placeholder.
                    assert len(page.locator("main").inner_text().strip()) > 80, f"Empty {nav} view"
                page.screenshot(path=str(OUTPUT / f"{label}-settings.png"), full_page=True)
                record(f"{label}: menu, profile, shop, settings, no horizontal overflow")
                context.close()

            # Every module is mounted independently, without changing shipped limits.
            for game in GAMES:
                context, page = new_page(game, True, game in LANDSCAPE)
                launch(page, game)
                current = profile(page)
                assert current["active"]["gameId"] == game
                assert current["daily"]["used"] == 1
                assert len(json.dumps(current["active"]["state"])) > 30, f"Missing scenario state: {game}"
                assert page.get_by_test_id("game-root").locator("button:enabled").count(), f"No playable controls: {game}"
                assert_no_overflow(page)
                if game in {"feldsher", "surgeon"}:
                    canvas = page.get_by_test_id("game-root").locator("canvas").first
                    expect(canvas).to_be_visible(timeout=20000)
                    page.wait_for_timeout(1000)
                    assert canvas.evaluate("canvas => {const gl=canvas.getContext('webgl2');return !!gl && gl.getParameter(gl.VERSION).includes('WebGL');}"), f"No live WebGL context: {game}"
                    image = Image.open(BytesIO(canvas.screenshot()))
                    variance = sum(ImageStat.Stat(image.convert("RGB")).var)
                    assert variance > 100, f"Blank or uniform 3D canvas: {game} variance={variance}"
                    assert image.width >= 200 and image.height >= 120
                page.screenshot(path=str(OUTPUT / f"{game}.png"), full_page=True)
                active_id = current["active"]["id"]
                page.reload(wait_until="networkidle")
                resume(page)
                restored = profile(page)
                assert restored["active"]["id"] == active_id and restored["daily"]["used"] == 1
                record(f"{game}: live module, saved scenario, reload/resume, one attempt" + (", nonblank WebGL canvas" if game in {"feldsher", "surgeon"} else ""))
                context.close()

            context, page = new_page("cosmetics", False)
            original_accent = page.locator("body").evaluate("el => getComputedStyle(el).getPropertyValue('--accent')")
            # Coins are an isolated test fixture; all purchasing and equipping
            # below go through the real shop, without adding production APIs.
            page.evaluate("key => {const p=JSON.parse(localStorage.getItem(key));p.coins=5000;localStorage.setItem(key,JSON.stringify(p));}", KEY)
            page.reload(wait_until="networkidle")
            page.get_by_role("navigation", name="Основная навигация", exact=True).get_by_test_id("nav-shop").click()
            purchases = {"frame-aurora": ("frame", "aurora"), "theme-violet": ("theme", "violet"), "title-expert": ("title", "Клинический эксперт"), "instrument-gold": ("instrument", "gold"), "background-grid": ("background", "grid"), "victory-confetti": ("victory", "confetti")}
            for item, (kind, value) in purchases.items():
                page.locator(f"[data-buy='{item}']").click()
                expect(page.locator(f"[data-buy='{item}']")).to_be_disabled()
                stored = profile(page)
                assert item in stored["inventory"] and stored["equipped"][kind] == value
                if kind == "title":
                    expect(page.locator("[data-profile-level]")).to_contain_text(value)
                else:
                    expect(page.locator("body")).to_have_attribute(f"data-{kind}", value)
            assert profile(page)["coins"] == 3710
            assert profile(page)["daily"]["used"] == 0
            assert page.locator("body").evaluate("el => getComputedStyle(el).getPropertyValue('--accent')") != original_accent
            assert page.locator("body").evaluate("el => getComputedStyle(el).backgroundImage") != "none"
            assert page.locator(".profile-trigger .avatar").evaluate("el => getComputedStyle(el).boxShadow") != "none"
            page.reload(wait_until="networkidle")
            for kind, value in purchases.values():
                if kind != "title":
                    expect(page.locator("body")).to_have_attribute(f"data-{kind}", value)
            launch(page, "intern")
            assert page.locator("[data-tool='temp']").evaluate("el => getComputedStyle(el).color") == "rgb(242, 209, 140)"
            page.locator("[data-end-shift]").click()
            page.locator("[data-abandon]").click()
            expect(page.get_by_test_id("mission-result")).to_be_visible()
            assert page.locator(".result-particles i").count() == 24
            assert page.locator(".result-card").evaluate("el => getComputedStyle(el).backgroundImage") != "none"
            page.screenshot(path=str(OUTPUT / "cosmetics-result.png"), full_page=True)
            record("Shop: six real purchases, exact coin debit, applied/persisted theme/frame/title/instrument/background/victory, visible gold tools and confetti")
            context.close()

            context, page = new_page("intern-full", False)
            launch(page, "intern")
            for index in range(6):
                complete_intern_patient(page)
                if index == 0:
                    before = profile(page)
                    page.reload(wait_until="networkidle")
                    resume(page)
                    after = profile(page)
                    assert after["active"]["id"] == before["active"]["id"]
                    assert after["active"]["state"]["completed"] == 1
                    assert after["daily"]["used"] == 1
            expect(page.get_by_test_id("mission-result")).to_be_visible(timeout=10000)
            receipt = profile(page)
            assert receipt["missions"] == 1 and receipt["successful"] == 1
            assert receipt["lastReceipt"]["score"] >= 95
            assert receipt["coins"] == 100 and receipt["xp"] > 0
            assert "first-shift" in receipt["achievements"]
            assert receipt["active"] is None
            page.screenshot(path=str(OUTPUT / "intern-result.png"), full_page=True)
            record("Intern: six full patient workflows, drag, hold, pressure, rhythm, triage, reload, S reward and achievement")

            page.get_by_test_id("return-hub").click()
            launch(page, "intern")
            assert profile(page)["daily"]["used"] == 2
            # Test-only fixture advances the timer to exercise timeout/loss without
            # spending six real minutes. No production API or cheat UI is added.
            context.add_init_script("(() => {const key='medical-rp:profile:v1';const p=JSON.parse(localStorage.getItem(key)||'null');if(p?.active?.state&&p.daily.used===2){p.active.state._kit.elapsed=361;localStorage.setItem(key,JSON.stringify(p));}})();")
            page.reload(wait_until="networkidle")
            resume(page)
            expect(page.get_by_test_id("mission-result")).to_be_visible(timeout=10000)
            assert profile(page)["lastReceipt"]["score"] < 50
            assert profile(page)["daily"]["used"] == 2
            page.get_by_test_id("return-hub").click()
            third = page.get_by_test_id("game-card-surgeon")
            if not third.is_disabled():
                third.click()
                expect(page.get_by_test_id("launch-mission")).to_be_disabled()
            assert profile(page)["active"] is None
            record("Daily limit: second mission consumes second attempt; timeout/loss; third launch blocked")
            context.close()

            assert not errors, "Browser errors:\n" + "\n".join(errors)
        except Exception:
            try:
                page.screenshot(path=str(OUTPUT / "failure.png"), full_page=True)
            except Exception:
                pass
            raise
        finally:
            report = {"base_url": url, "seconds": round(time.monotonic() - started, 2), "checks": checks, "errors": errors}
            (OUTPUT / "browser-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
            browser.close()

    print(f"Browser checks completed in {time.monotonic() - started:.1f}s; artifacts: {OUTPUT}")


if __name__ == "__main__":
    main()
