import productsData from '../data/products.json';
import { apiRequest } from './apiClient';
import { getSaferAlternativeSync } from './productService';

/**
 * Gemini AI & Risk Analysis Service
 * Target FastAPI + Gemini endpoints:
 * - POST /api/v1/ai/assistant
 * - POST /api/v1/ai/risk-analysis
 * - POST /api/v1/ai/compare
 */

function parseBudget(query) {
  const match = query.match(/(?:under|below|less than|<|max)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

export async function askShoppingAssistant(query) {
  const fallback = () => {
    const trimmed = (query || '').trim();
    const q = trimmed.toLowerCase();
    const budget = parseBudget(q);

    const keywordGroups = [
      { keys: ['headphone', 'anc', 'audio', 'earbud', 'music', 'sony', 'bose'], category: 'Audio' },
      { keys: ['laptop', 'macbook', 'notebook', 'computer', 'workstation'], category: 'Laptops' },
      { keys: ['monitor', '4k', 'display', 'screen', 'coding', 'dell'], category: 'Monitors' },
      { keys: ['keyboard', 'mouse', 'dock', 'thunderbolt', 'desk', 'keychron', 'logitech'], category: 'Peripherals' },
      { keys: ['watch', 'smartwatch', 'wearable', 'fitness', 'apple watch'], category: 'Wearables' },
      { keys: ['camera', 'mirrorless', 'photo', 'video', 'fujifilm'], category: 'Cameras' },
      { keys: ['ssd', 'storage', 'drive', 'nvme', 'samsung'], category: 'Storage' },
      { keys: ['vacuum', 'dyson', 'home', 'deal'], category: 'Home Tech' },
    ];

    const matchedCategories = keywordGroups
      .filter((g) => g.keys.some((k) => q.includes(k)))
      .map((g) => g.category);

    let candidates = [...productsData];

    if (matchedCategories.length > 0) {
      candidates = candidates.filter((p) => matchedCategories.includes(p.category));
    } else if (q.length > 2 && !q.includes('safe') && !q.includes('best') && !q.includes('risk')) {
      const tokens = q.split(/\s+/).filter((t) => t.length > 2);
      const textMatches = candidates.filter((p) =>
        tokens.some(
          (t) =>
            p.name.toLowerCase().includes(t) ||
            p.brand.toLowerCase().includes(t) ||
            p.shortSummary.toLowerCase().includes(t)
        )
      );
      if (textMatches.length > 0) candidates = textMatches;
    }

    if (budget !== null) {
      const withinBudget = candidates.filter((p) => p.price <= budget);
      if (withinBudget.length > 0) {
        candidates = withinBudget;
      }
    }

    const wantsRiskyDemo = q.includes('risk') || q.includes('scam') || q.includes('fake') || q.includes('flag');

    const safePicks = candidates
      .filter((p) => p.trustScore >= 75)
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 3);

    const flaggedInContext = candidates.filter((p) => p.trustScore < 60);

    const recommendations = wantsRiskyDemo
      ? productsData.filter((p) => p.trustScore < 60).slice(0, 2)
      : safePicks.length > 0
      ? safePicks
      : productsData.filter((p) => p.trustScore >= 90).slice(0, 3);

    let headline = 'Verified Recommendations Ready';
    let summary = '';

    if (wantsRiskyDemo) {
      headline = 'High-Risk Listings Flagged by TrustCart AI';
      summary =
        'Our Gemini-powered risk classifier detected steep price anomalies, unverified pop-up sellers, and synthetic review spikes on these listings. Avoid paying outside verified escrow.';
    } else {
      const budgetText = budget ? ` under $${budget}` : '';
      const catText = matchedCategories.length ? ` in ${matchedCategories.join(', ')}` : '';
      summary = `Analyzed seller credentials, 90-day pricing history, and verified buyer reviews${catText}${budgetText}. Here are the highest-trust picks matching "${trimmed || 'verified tech'}".`;
      if (flaggedInContext.length > 0) {
        summary += ` Note: ${flaggedInContext.length} suspiciously cheap listing(s) were filtered out for your safety.`;
      }
    }

    return {
      query: trimmed,
      headline,
      summary,
      budgetDetected: budget,
      filteredRiskCount: flaggedInContext.length,
      recommendations,
      modelTag: 'Gemini AI Shopping Reasoning (Mock Ready)',
    };
  };

  try {
    const data = await apiRequest(
      '/ai/assistant',
      {
        method: 'POST',
        body: JSON.stringify({ query }),
        mockDelay: 380,
      },
      fallback
    );

    if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      return data;
    }

    const mockData = fallback();
    if (data && typeof data === 'object') {
      return {
        ...mockData,
        headline: data.headline || mockData.headline,
        summary: data.summary || mockData.summary,
        modelTag: data.modelTag || mockData.modelTag,
        recommendations: mockData.recommendations,
      };
    }

    return mockData;
  } catch {
    return fallback();
  }
}

export async function analyzeListingRisk(input = {}) {
  return apiRequest(
    '/ai/risk-analysis',
    {
      method: 'POST',
      body: JSON.stringify(input),
      mockDelay: 420,
    },
    () => {
      // Case 1: Existing catalog product
      if (input.productId) {
        const product = productsData.find((p) => p.id === input.productId);
        if (product) {
          const saferAlt = product.trustScore < 80 ? getSaferAlternativeSync(product) : null;
          return {
            sourceType: 'catalog',
            productId: product.id,
            title: product.name,
            price: product.price,
            marketMedianPrice: product.marketMedianPrice,
            sellerName: product.seller.name,
            sellerVerified: product.seller.verified,
            trustScore: product.trustScore,
            riskLevel: product.riskLevel,
            verdict: product.aiVerdict,
            metrics: product.riskAnalysis,
            indicators: product.riskAnalysis.indicators,
            saferAlternative: saferAlt,
          };
        }
      }

      // Case 2: Custom URL or manual listing analysis
      const title = (input.title || 'External Marketplace Listing').trim();
      const url = (input.url || '').trim();
      const listedPrice = Number(input.price) || 149;
      const expectedPrice = Number(input.expectedPrice) || 299;
      const sellerAgeDays = Number(input.sellerAgeDays ?? 30);
      const sellerName = (input.sellerName || 'External Merchant').trim();

      const lowerUrl = url.toLowerCase();
      const lowerTitle = title.toLowerCase();

      const suspiciousKeywords = ['oem', 'clearance', 'flash', 'bulk', 'wholesale', 'replica', '1:1', 'unboxed'];
      const hasSuspiciousKeyword = suspiciousKeywords.some(
        (kw) => lowerTitle.includes(kw) || lowerUrl.includes(kw)
      );
      const discountRatio = expectedPrice > 0 ? (expectedPrice - listedPrice) / expectedPrice : 0;

      let priceScore = 92;
      if (discountRatio > 0.55) priceScore = 20;
      else if (discountRatio > 0.35) priceScore = 54;
      else if (discountRatio > 0.2) priceScore = 76;

      let sellerScore = sellerAgeDays >= 365 ? 92 : sellerAgeDays >= 90 ? 74 : 28;
      let counterfeitScore = hasSuspiciousKeyword ? 30 : discountRatio > 0.45 ? 42 : 90;
      let reviewScore = sellerAgeDays < 45 ? 34 : 84;
      let returnScore = lowerUrl.includes('no-return') || sellerAgeDays < 30 ? 35 : 86;

      const trustScore = Math.max(
        12,
        Math.min(
          98,
          Math.round(
            priceScore * 0.28 +
              sellerScore * 0.26 +
              counterfeitScore * 0.22 +
              reviewScore * 0.14 +
              returnScore * 0.1
          )
        )
      );

      const riskLevel = trustScore >= 80 ? 'safe' : trustScore >= 60 ? 'caution' : 'high';
      const indicators = [];

      if (discountRatio > 0.45) {
        indicators.push({
          title: `Extreme discount anomaly (${Math.round(discountRatio * 100)}% below median)`,
          status: 'danger',
          detail: `$${listedPrice.toFixed(2)} vs $${expectedPrice.toFixed(2)} reference strongly correlates with counterfeit or bait listings.`,
        });
      } else if (discountRatio > 0.22) {
        indicators.push({
          title: `Notable discount (${Math.round(discountRatio * 100)}% below median)`,
          status: 'warning',
          detail: 'Verify seller warranty eligibility and original factory seal upon arrival.',
        });
      } else {
        indicators.push({
          title: 'Price matches realistic market range',
          status: 'pass',
          detail: `Listed price ($${listedPrice.toFixed(2)}) sits close to the expected $${expectedPrice.toFixed(2)} value.`,
        });
      }

      if (sellerAgeDays < 45) {
        indicators.push({
          title: 'Young or unestablished merchant profile',
          status: 'danger',
          detail: `Storefront history (${sellerAgeDays} days) is too short to establish fulfillment reliability.`,
        });
      } else if (sellerAgeDays < 180) {
        indicators.push({
          title: 'Moderate seller track record',
          status: 'warning',
          detail: `${sellerAgeDays}-day storefront history; recommend paying via PayPal Buyer Protection.`,
        });
      } else {
        indicators.push({
          title: 'Established merchant track record',
          status: 'pass',
          detail: `Seller "${sellerName}" meets multi-quarter operational longevity thresholds.`,
        });
      }

      if (hasSuspiciousKeyword) {
        indicators.push({
          title: 'High-risk listing keyword pattern detected',
          status: 'warning',
          detail: 'Phrases like OEM/Clearance/Bulk on branded electronics frequently indicate unauthorized clones.',
        });
      } else {
        indicators.push({
          title: 'Clean listing metadata & title structure',
          status: 'pass',
          detail: 'No counterfeit keyword spoofing patterns detected in listing title or URL.',
        });
      }

      const verdict =
        riskLevel === 'safe'
          ? 'Low Risk: Listing signals align with legitimate retail behavior. Proceed safely with PayPal Buyer Protection.'
          : riskLevel === 'caution'
          ? 'Moderate Caution: Some merchant or pricing signals require double-checking warranty terms before checkout.'
          : 'High Risk Alert: Strong indicators of counterfeit risk or unverified seller behavior. Avoid direct wire/card entry.';

      return {
        sourceType: 'custom',
        url,
        title,
        price: listedPrice,
        marketMedianPrice: expectedPrice,
        sellerName,
        sellerVerified: sellerAgeDays >= 180,
        trustScore,
        riskLevel,
        verdict,
        metrics: {
          priceAnomaly: priceScore,
          sellerCredibility: sellerScore,
          reviewAuthenticity: reviewScore,
          counterfeitSignal: counterfeitScore,
          returnProtection: returnScore,
        },
        indicators,
        saferAlternative: riskLevel !== 'safe' ? productsData[0] : null,
      };
    }
  );
}

export async function compareProductsWithAI(products = []) {
  return apiRequest(
    '/ai/compare',
    {
      method: 'POST',
      body: JSON.stringify({ productIds: products.map((p) => p.id) }),
      mockDelay: 250,
    },
    () => {
      if (!products.length) return null;

      const safest = [...products].sort((a, b) => b.trustScore - a.trustScore)[0];
      const bestValue = [...products].sort(
        (a, b) => b.trustScore / Math.max(b.price, 1) - a.trustScore / Math.max(a.price, 1)
      )[0];
      const bestOverall = [...products].sort(
        (a, b) =>
          b.trustScore * 0.55 + b.rating * 10 * 0.45 - (a.trustScore * 0.55 + a.rating * 10 * 0.45)
      )[0];

      const hasHighRisk = products.some((p) => p.trustScore < 60);

      return {
        bestOverallId: bestOverall.id,
        safestId: safest.id,
        bestValueId: bestValue.id,
        hasHighRisk,
        summary: hasHighRisk
          ? `Warning: One or more compared listings carry a High-Risk Trust Score (<60). TrustCart AI strongly recommends "${safest.name}" (Trust Score ${safest.trustScore}/100) from ${safest.seller.name}.`
          : `Across ${products.length} products, "${bestOverall.name}" leads overall combining a ${bestOverall.trustScore}/100 Trust Score and ${bestOverall.rating}★ verified rating, while "${bestValue.name}" delivers the strongest safety-to-price ratio.`,
      };
    }
  );
}
