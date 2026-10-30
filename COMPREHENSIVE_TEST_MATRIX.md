# ADAB AI Copilot: Comprehensive End-to-End User Acceptance Testing (UAT) Plan

**Document Version:** 1.0.0  
**Target Environment:** Local Staging (`Frontend: http://localhost:5173` | `Backend: http://localhost:5003`)  
**Target Merchant Account:** Phone `9999999999` (*mayank enterprise*)  
**Execution Mode:** Continuous Unified Test Run (All Domains)

---

## Executive Overview: What Is Remaining?

* **Codebase & Backend Implementation:** **100% Complete.** All 12 MCP tools, Gemini 3.5 Flash integration with 503 fallback, Generative UI cards, PostgreSQL audit trail (`ai_audit_logs`), DPDP Act PII protection, and Web Audio chimes are deployed and verified (17 backend test suites / 118 tests passing; 18 frontend test suites / 88 tests passing).
* **What Remains:** **End-to-End User Acceptance Verification (UAT)**. Validating that the conversational interactions, visual cards, vernacular responses, audio feedback, and database mutations feel natural, accurate, and responsive from a store owner's perspective.

---

## Prerequisites: Launching the Test Environment

1. Open your browser (Google Chrome or Microsoft Edge recommended for native Web Speech API support).
2. Navigate to: `http://localhost:5173`
3. Sign in with the test seller phone: **`9999999999`**.
4. In the top navigation header, locate and click the **`✨ AI Copilot [FREE]`** button (or click the floating AI tab on mobile view).
5. The **ADAB Copilot Slideout Drawer** will open on the right edge with a purple gradient header showing:
   * Store Name: `mayank enterprise`
   * Engine Badge: `Gemini 3.5 • Free Mode`
   * Top Quick Action Suggestion Strip (5 horizontal pill buttons)

---

## Comprehensive Test Matrix by Domain

### Test Case 1: Store Operational Status & Hardware Control
**Objective:** Verify real-time inspection and 1-click toggling of store open/close state and soundbox announcements.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | **Check Status** | Click the **`🏪 Store Status`** pill (or type: *"Is my store open right now?"*) | Gemini queries `adab_get_store_info`. A `STORE_STATUS_CARD` renders showing store name, operating hours (`08:00 - 22:00`), radius (`10 km`), and an emerald `● Open` badge. | Card appears with accurate DB data. |
| **1.2** | **Toggle Close** | Click the **`Close Store`** button on the card | Sends command to `adab_update_store_status`. Web Audio chime rings ("Ding-dong!"). Store updates to offline in DB, badge flips to rose `○ Closed`. | Audio chime plays; DB `is_online` updates to `false`. |
| **1.3** | **Toggle Open** | Click **`Open Store`** | Store reopens. Audio chime plays; badge flips back to emerald `● Open`. | Store returns to active order-accepting state. |

---

### Test Case 2: Customer Order Fulfillment & Packing Lifecycle
**Objective:** Verify real-time order listing, FSM validation, batch packing, and resolution of the previous `"Pack order undefined"` bug.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | **List Orders** | Click **`📦 Pack Orders`** pill (or type: *"List all pending customer orders"*) | Gemini calls `adab_list_orders`. An `ORDER_PACK_CARD` appears listing active store orders with customer names, amounts in ₹, item counts, and normalized order numbers (e.g. `ORD-108`). | **NO `undefined` values appear.** All IDs are valid strings. |
| **2.2** | **Single Pack** | Click **`Pack Order`** on the first listed order card | Sends `Pack order <orderNumber>`. Executes `adab_update_order_state`. Audio confirmation chime plays. An emerald `ORDER_STATUS_UPDATED_CARD` appears confirming status transitioned to `PACKED`. | Order status updates in PostgreSQL `seller_orders`; chime sounds. |
| **2.3** | **Batch Pack** | Click **`Pack All Pending Orders`** button at the bottom of the card | Assistant processes remaining active orders in sequence and returns a summary of all packed orders. | Multiple orders transition to `PACKED` simultaneously. |

---

### Test Case 3: Catalog Inventory & Low-Stock Alerts
**Objective:** Verify threshold-based stock inspection and proactive supplier restock suggestions.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | **Check Low Stock** | Click **`⚠️ Low Stock`** pill (or type: *"Check low stock items"*) | Gemini executes `adab_check_low_stock`. A `LOW_STOCK_CARD` appears. If all items have $> 5$ units, an emerald banner confirms all items are well-stocked. If items are low, red unit warnings appear. | Returns live inventory numbers from `seller_listings`. |
| **3.2** | **Direct Restock** | Type: *"Update stock of Basmati Rice to 45 packets"* | Assistant invokes `adab_update_stock_qty`. An `INVENTORY_MUTATION_CARD` appears confirming quantity changed from previous value to `45 units`. Audio chime plays. | Stock count commits directly to `seller_listings.stock_qty`. |

---

### Test Case 4: Catalog Pricing & Listing State Management
**Objective:** Verify price adjustments with strict `sellPrice <= mrp` rule enforcement and catalog pause/resume toggling.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | **Valid Price Change** | Type: *"Change selling price of Basmati Rice to 140"* | Invokes `adab_modify_pricing`. Assistant verifies `140 <= MRP`, commits the price, and renders `INVENTORY_MUTATION_CARD`. Audio chime plays. | Price updates in DB; natural language confirmation returned. |
| **4.2** | **Safety Rejection** | Type: *"Set selling price of Basmati Rice to 9999"* | Assistant detects that selling price exceeds MRP and strictly rejects the mutation with an informative error: *"Selling price cannot exceed MRP"*. | **Database rejects the mutation;** no corrupt data committed. |
| **4.3** | **Toggle Item Active** | Type: *"Pause listing for Tata Salt"* | Invokes `adab_toggle_listing_status`. Product listing `is_active` set to `false`. | Tata Salt becomes hidden from buyer apps. |

---

### Test Case 5: Real-Time Sales & Financial Analytics
**Objective:** Verify multi-period revenue, volume, AOV, and net seller payout computation.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **5.1** | **Today's Report** | Click **`📈 Sales Report`** pill (or type: *"Show today's sales summary"*) | Gemini invokes `adab_get_sales_performance`. A 3-column `SALES_SUMMARY_CARD` renders displaying **Revenue (₹)**, **Total Orders**, **Average Ticket (AOV)**, and **Net Seller Payout**. | Computes aggregates from `seller_orders` created today. |
| **5.2** | **Monthly Window** | Type: *"Show sales performance for this month"* | Assistant re-runs query over the current calendar month. Card updates with monthly turnover and completed order counts. | Time filter accurately bounds database records. |

---

### Test Case 6: GSTR-1 Multi-Slab Tax Compliance
**Objective:** Verify compliant Indian GST classification over settled store orders into 0%, 5%, 12%, and 18% tax slabs.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **6.1** | **Tax Summary** | Click **`📑 GSTR Tax`** pill (or type: *"Show GSTR tax breakdown"*) | Gemini invokes `adab_get_multi_slab_gstr`. Renders `GSTR_TAX_CARD` with **Taxable Turnover**, **Total Tax Liability**, and **Gross Invoiced Amount**. | Accurate numerical calculations matching PostgreSQL turnover. |
| **6.2** | **Slab Breakdown** | Inspect the table inside the tax card | Displays 4 distinct rows: <br>• 0% Exempt Staples<br>• 5% Spices/Oils (CGST 2.5% + SGST 2.5%)<br>• 12% Packaged Foods (CGST 6% + SGST 6%)<br>• 18% FMCG (CGST 9% + SGST 9%) | CGST and SGST splits match the statutory percentages. |

---

### Test Case 7: B2B Wholesale Procurement & Purchase Orders
**Objective:** Verify cross-store wholesale discovery and 1-click B2B purchase order drafting.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **7.1** | **Search Wholesalers**| Type: *"Find B2B suppliers for mustard oil"* | Invokes `adab_query_b2b_wholesalers`. Renders a `B2B_RESTOCK_CARD` displaying nearby wholesale hubs, wholesale pricing vs MRP, distance in km, and a green badge: **`✓ 14-Day B2B Credit Available`**. | Discovers wholesale listings from other merchant stores in DB. |
| **7.2** | **Draft PO** | Click **`Draft PO`** on any wholesale card | Invokes `adab_draft_b2b_restock_po`. Audio chime plays. A purple `PURCHASE_ORDER_DRAFTED_CARD` renders with formal PO Number, total amount, and 14-day credit terms. | PO record drafted in `b2b_purchase_orders`. |

---

### Test Case 8: Vernacular Multilingual Execution (Hindi & Gujarati)
**Objective:** Verify seamless natural language switching across English, Hindi, and Gujarati with localized prompt pills.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **8.1** | **Switch to Hindi** | In the top portal bar, change language selector to **हिन्दी** | Copilot Drawer quick pills immediately update to Hindi: <br>• *ऑर्डर पैक करें*<br>• *बिक्री रिपोर्ट*<br>• *कम स्टॉक*<br>• *GSTR टैक्स*<br>• *दुकान स्थिति* | UI labels adapt to Hindi dynamically. |
| **8.2** | **Hindi Query** | Type or speak: *"मेरे स्टोर के GSTR टैक्स का हिसाब बताओ"* | Gemini replies fluently in Hindi while preserving all currency amounts in ₹, numbers, and tax percentages. Renders the interactive GSTR card. | Full Hindi synthesis with accurate operational numbers. |
| **8.3** | **Switch to Gujarati** | Change language selector to **ગુજરાતી** | Copilot Drawer quick pills update to Gujarati (*ઓર્ડર પેક કરો*, *વેચાણ રિપોર્ટ*, *ઓછો સ્ટોક*). Prompting *"મારી દુકાન ખુલ્લી છે?"* returns store status in Gujarati. | Full Gujarati synthesis and UI localization. |

---

### Test Case 9: Web Speech API & Native Audio Feedback
**Objective:** Verify hands-free voice transcription and auditory action verification.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **9.1** | **Microphone Test** | Click the microphone icon next to the chat input | Mic button turns red with a pulse animation. Speak in English, Hindi, or Gujarati (e.g. *"Check low stock"*). Transcript automatically enters input and submits. | Hands-free voice recognition functions via browser STT. |
| **9.2** | **Audio Verification**| Execute any packing or restock command | Web Audio oscillator chime ("Ding-dong!") sounds immediately upon tool execution completion. | Audio chime provides hands-free confirmation. |

---

### Test Case 10: PostgreSQL Audit Trail & DPDP Privacy Protection
**Objective:** Verify that all actions produce immutable audit logs and customer PII is never exposed to the LLM.

| Step | Action | Exact Prompt / Click | Expected UI & System Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **10.1** | **PII Scrubbing** | Type: *"Customer 9876543210 wants to know order status"* | The `scrubPII` pipeline masks the phone number to `98******10` before sending to Google Gemini. | No raw 10-digit customer mobile numbers sent to LLM. |
| **10.2** | **Audit Log Verification** | In a terminal, run: <br>`node -e "const pool = require('./ADAB-Shop-Portal/Shop-Backend/db'); pool.query('SELECT * FROM ai_audit_logs ORDER BY created_at DESC LIMIT 5').then(r => console.table(r.rows));"` | Displays the 5 most recent actions with `store_id`, `prompt`, `tool_name`, `duration_ms`, and `success: true`. | Every user prompt has an immutable audit log row in PostgreSQL. |

---

## Unified Test Run Checklist Summary

Print or keep this checklist open while testing:

- [ ] **Case 1:** Store Status Card opens, shows `● Open`, toggles to `○ Closed`, re-opens cleanly.
- [ ] **Case 2:** Pending orders listed with real IDs (no `undefined`), Pack Order button advances status to `PACKED` with emerald checkmark card.
- [ ] **Case 3:** Low stock alerts inspected, 1-click quantity restock commits to database.
- [ ] **Case 4:** Pricing modification updates sell price; invalid price exceeding MRP rejected.
- [ ] **Case 5:** Sales report card displays Revenue, Orders, AOV, and Net Payout.
- [ ] **Case 6:** GSTR-1 tax card computes 0%, 5%, 12%, 18% slab splits accurately.
- [ ] **Case 7:** B2B wholesale search displays suppliers with 14-day credit tags; 1-click PO drafted.
- [ ] **Case 8:** Language toggled between English, Hindi, and Gujarati; pills and replies adapt instantly.
- [ ] **Case 9:** Microphone voice input captures transcript; action completion chime rings.
- [ ] **Case 10:** Customer phone numbers masked (`98******10`); `ai_audit_logs` records all turns in PostgreSQL.