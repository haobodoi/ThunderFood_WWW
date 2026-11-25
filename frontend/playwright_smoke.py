from playwright.sync_api import sync_playwright


def check_viewport(page, width, height):
    page.set_viewport_size({"width": width, "height": height})
    page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
    overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    offenders = page.evaluate("""() => [...document.querySelectorAll('body *')]
      .filter(node => node.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8).map(node => ({ tag: node.tagName, className: node.className, right: Math.round(node.getBoundingClientRect().right) }))""")
    assert not overflow, f"horizontal overflow at {width}px: {offenders}"
    assert page.locator("#home-hero-search").is_visible()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
    quick_search = page.get_by_role("button", name="Cơm tấm")
    assert quick_search.is_visible()
    quick_search.click()
    page.wait_for_timeout(300)
    assert page.locator("#discovery-search").input_value() == "Cơm tấm"

    explore = page.get_by_role("link", name="Khám phá quán ngon")
    explore.click()
    page.wait_for_timeout(250)
    assert explore.get_attribute("aria-current") == "page"
    page.go_back(wait_until="networkidle")
    assert page.locator(".navbar").get_by_role("link", name="Trang chủ", exact=True).get_attribute("aria-current") == "page"

    for width in (320, 390, 768, 1280, 1440):
        check_viewport(page, width, 800)
    assert not errors, "JavaScript errors: " + "; ".join(errors)
    browser.close()

print("Playwright public-navigation smoke passed")
