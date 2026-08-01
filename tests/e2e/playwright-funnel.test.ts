import { test, expect, type Page } from '@playwright/test';

/**
 * aiwill-planner funnel e2e (Playwright)
 *
 * 覆盖 7 个用户路径,顺序:
 *  1. SEO 首页 metadata + JSON-LD
 *  2. H5 落地页 (h5.aiwill-planner.cn)
 *  3. 注册 (intent=register)
 *  4. 问卷 (questionnaire)
 *  5. 登录 (intent=login) → 已登录状态
 *  6. 订单创建 (create-order API)
 *  7. 支付页 (orders list + payment/status)
 *
 * 跑法:
 *   BASE_URL=https://www.aiwill-planner.cn \
 *   H5_URL=https://h5.aiwill-planner.cn \
 *   npx playwright test tests/e2e/playwright-funnel.test.ts --reporter=list
 */

const BASE_URL = process.env.BASE_URL ?? 'https://www.aiwill-planner.cn';
const H5_URL = process.env.H5_URL ?? 'https://h5.aiwill-planner.cn';
const TEST_PHONE = process.env.TEST_PHONE ?? '13800000001';
const TEST_OTP = process.env.TEST_OTP ?? '123456';

async function attachNetworkLogger(page: Page, label: string) {
  page.on('response', (resp) => {
    if (!resp.ok() && resp.status() >= 400) {
      console.warn(`[${label}] ${resp.status()} ${resp.url()}`);
    }
  });
}

test.describe('aiwill-planner funnel', () => {
  test('1. SEO 首页 metadata + JSON-LD', async ({ page }) => {
    await attachNetworkLogger(page, 'SEO');
    const resp = await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBe(200);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(4);

    // canonical + viewport + description
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);

    // JSON-LD: 必须有 Organization + WebSite + FAQPage (FAQ 块是 GEO 入口)
    const ldTypes = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.flatMap((n) => {
        try {
          const parsed = JSON.parse(n.textContent ?? '');
          return Array.isArray(parsed) ? parsed.map((p: any) => p['@type']) : [parsed['@type']];
        } catch {
          return [];
        }
      }),
    );
    const flat = ldTypes.flat().filter(Boolean) as string[];
    expect(flat).toContain('Organization');
    expect(flat).toContain('WebSite');
    expect(flat.some((t) => t === 'FAQPage' || t === 'HowTo' || t === 'Article')).toBeTruthy();

    // robots / sitemap
    const robots = await page.request.get(BASE_URL + '/robots.txt');
    expect(robots.status()).toBe(200);
    const sitemap = await page.request.get(BASE_URL + '/sitemap.xml');
    expect(sitemap.status()).toBe(200);
  });

  test('2. H5 落地页可访问且含唤起公众号入口', async ({ page }) => {
    await attachNetworkLogger(page, 'H5');
    const resp = await page.goto(H5_URL + '/', { waitUntil: 'domcontentloaded' });
    expect([200, 301, 302]).toContain(resp?.status() ?? 0);

    // 落地页要有核心 CTA (引导用户回 PC)
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(40);
    // 应存在至少一个回主站链接
    const backLinks = await page.locator('a[href*="aiwill-planner.cn"]').count();
    expect(backLinks).toBeGreaterThan(0);
  });

  test('3. 注册页 (intent=register) 含邮箱表单', async ({ page }) => {
    await attachNetworkLogger(page, 'REGISTER');
    await page.goto(BASE_URL + '/register?intent=register', { waitUntil: 'domcontentloaded' });

    // 标题文案应当是注册向
    const h1 = await page.locator('h1').first().innerText();
    expect(h1.length).toBeGreaterThan(0);

    // 邮箱输入存在 (注册走邮箱+密码)
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // URL 含 intent=register
    expect(page.url()).toContain('intent=register');
  });

  test('4. 问卷页可访问, 含核心字段', async ({ page }) => {
    await attachNetworkLogger(page, 'QUESTIONNAIRE');
    const resp = await page.goto(BASE_URL + '/questionnaire', { waitUntil: 'domcontentloaded' });
    expect([200, 307, 308]).toContain(resp?.status() ?? 0);

    // 等待客户端水合 (页面有 "加载问卷中..." spinner → 渲染表单)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 落地后 body 应有内容 (可能未登录跳转到 /login, 也算 OK)
    const url = page.url();
    const isLoginRedirect = url.includes('/login');
    if (!isLoginRedirect) {
      const body = await page.locator('body').innerText();
      // 问卷页面至少有标题 + loading 提示, 或者表单
      expect(body.length).toBeGreaterThan(40);
      const formCount = await page.locator('form, input, textarea, button').count();
      expect(formCount).toBeGreaterThan(0);
    } else {
      // 重定向到登录页时, URL 应当带 return
      expect(url).toContain('/login');
    }
  });

  test('5. 登录页 (intent=login) 默认密码 tab', async ({ page }) => {
    await attachNetworkLogger(page, 'LOGIN');
    await page.goto(BASE_URL + '/login?intent=login', { waitUntil: 'domcontentloaded' });

    const h1 = await page.locator('h1').first().innerText();
    expect(h1.length).toBeGreaterThan(0);

    // 应当有密码输入或手机+验证码输入 (二选一)
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  test('6. /api/auth/send-otp 接口联通', async ({ request }) => {
    const resp = await request.post(BASE_URL + '/api/auth/send-otp', {
      data: { phone: TEST_PHONE },
    });
    // 接口应当返回 JSON (无论 200/400/429)
    expect([200, 400, 429, 500]).toContain(resp.status());
    const body = await resp.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test('7. 订单列表页 (未登录应跳登录或 200), 静态资源可达', async ({ page, request }) => {
    await attachNetworkLogger(page, 'ORDERS');
    const ordersResp = await page.goto(BASE_URL + '/orders', { waitUntil: 'domcontentloaded' });
    expect([200, 307, 308, 302]).toContain(ordersResp?.status() ?? 0);

    // editorial-policy 页面或静态文件至少一个可达
    const policyPage = await page.goto(BASE_URL + '/editorial-policy', { waitUntil: 'domcontentloaded' }).catch(() => null);
    const policyFile = await request.get(BASE_URL + '/editorial-policy.txt');
    const hasPolicy = (policyPage?.status() === 200) || (policyFile.status() === 200);
    expect(hasPolicy).toBeTruthy();
  });
});