# TrustCart AI

> **Think Smart. Shop Safe. Pay Confidently.**

TrustCart AI is a modern, light-theme AI shopping assistant web application built with **React + Vite**, **Tailwind CSS**, **JavaScript**, and **Lucide React Icons**. Its modular service layer is pre-structured for seamless integration with **FastAPI**, **Gemini AI**, **Supabase**, and **PayPal Sandbox**.

## Features & Pages

1. **AI Shopping Assistant (`/`)** — Natural-language product search bar with instant prompt suggestions, AI reasoning summary, budget extraction, and risk filtering.
2. **Product Listing (`/products`)** — Full catalog with live search, category pills, Trust Score filters, max-price slider, verified-seller toggle, sorting, and floating 3-item comparison tray.
3. **Product Details (`/products/:id`)** — Product gallery, historical market median check, specifications table, verified seller profile, and quick risk inspection links.
4. **Product Comparison (`/compare`)** — Side-by-side comparison for up to 3 products with an automated AI winner verdict across Trust Score, pricing, and specs.
5. **AI Risk Analysis (`/risk-analysis`)** — Multi-factor listing risk scanner (`Price Integrity`, `Seller Identity`, `Review Authenticity`, `Counterfeit Signal`, `Return Protection`) supporting both catalog items and custom external URLs/deals.
6. **Checkout (`/checkout`)** — Cart management, high-risk item guardrails, shipping options, and an interactive PayPal Sandbox checkout flow.
7. **Order History (`/orders`)** — Protected purchase ledger with PayPal transaction IDs, verification timelines, buy-again actions, and downloadable receipts.

## Project Structure

```text
src/
├── components/
│   ├── checkout/PayPalSandboxModal.jsx
│   ├── common/ProductCard.jsx
│   ├── common/Toast.jsx
│   ├── common/TrustBadge.jsx
│   ├── layout/Footer.jsx
│   ├── layout/Navbar.jsx
│   └── risk/RiskGauge.jsx
├── context/TrustCartContext.jsx
├── data/
│   ├── orders.json
│   └── products.json
├── pages/
│   ├── AIRiskAnalysisPage.jsx
│   ├── CheckoutPage.jsx
│   ├── HomePage.jsx
│   ├── OrderHistoryPage.jsx
│   ├── ProductComparisonPage.jsx
│   ├── ProductDetailsPage.jsx
│   └── ProductListingPage.jsx
├── services/
│   ├── aiService.js         # Ready for FastAPI + Gemini AI
│   ├── apiClient.js         # Base FastAPI fetch client with mock fallback
│   ├── orderService.js      # Ready for FastAPI + Supabase persistence
│   ├── paypalService.js     # Ready for PayPal Sandbox Orders v2 API
│   └── productService.js    # Product & seller endpoints
└── utils/formatters.js
```

## Running Locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when connecting your FastAPI, Supabase, and PayPal Sandbox credentials.
