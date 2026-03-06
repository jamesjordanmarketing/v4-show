# RAG Golden-Set Regression Test Report

**Run ID:** 54c97c52-9f51-4e9b-8f1e-92831283b025
**Started:** 2026-02-18T22:48:46.614Z
**Completed:** 2026-02-18T22:57:37.867Z
**Duration:** 531s
**Result:** FAIL (target: >=85%)
**Embedding Run:** 055f333e-9431-43ab-9b45-6b8b5b2688ae

## Summary

| Metric | Value |
|--------|-------|
| Pass Rate | 69% |
| Passed | 11 |
| Failed | 5 |
| Errored | 0 |
| Avg Response Time | 23s |
| Avg Self-Eval Score | 58% |

## Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| easy | 3 | 5 | 60% |
| medium | 7 | 9 | 78% |
| hard | 1 | 2 | 50% |

## Preflight Checks

**Overall:** PASSED

- [PASS] **Document Exists** — Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready
- [PASS] **Knowledge Base Link** — knowledge_base_id: 5c1db414...
- [PASS] **Embeddings Exist** — 1000 embeddings (tier1: 1, tier2: 29, tier3: 970) | single run ~2026-02-18T22:46Z | 1 tagged run(s)
- [PASS] **RPC Function (match_rag_embeddings_kb)** — RPC available and callable
- [PASS] **Anthropic API Key** — ANTHROPIC_API_KEY set (sk-ant-...LQAA)
- [PASS] **OpenAI API Key** — OPENAI_API_KEY set (sk-pr...nGkA)

## Individual Results

### Failed (5)

#### GS-002: FAIL [easy]

**Question:** What is the minimum FICO score for conventional loans?
**Expected substring:** `620`
**Self-eval:** 95%
**Response time:** 17s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The provided context does not contain information about minimum FICO score requirements for conventional loans. The document only specifies FICO score requirements for Sun Chip Private Bank's Jumbo Mortgage Program, which requires [Section: BC-PROD-004: Jumbo Mortgage Program] "a minimum FICO score of 740 is required for all signers." This requirement applies specifically to jumbo mortgages on U.S. residential properties exceeding $1.5M, not to conventional loans generally. To answer your questi
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 24

---

#### GS-004: FAIL [easy]

**Question:** What is the maximum cash deposit without enhanced due diligence?
**Expected substring:** `10,000`
**Self-eval:** 15%
**Response time:** 25s
**Category:** direct-lookup

**Response (first 500 chars):**

```
Based on the provided context, there is no explicit threshold defined for a 'maximum cash deposit without enhanced due diligence.' However, the manual establishes several relevant thresholds for enhanced scrutiny:

For Source of Funds (SOF) verification, [Section: BC-COMP-002] specifies that 'All inbound transfers >$1M' trigger SOF requirements. Additionally, [Section: BC-COMP-002] states that 'Any single inbound transaction >$1,000,000.00 USD' serves as the SOF Trigger threshold.

For ACH trans
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 25

---

#### GS-008: FAIL [medium]

**Question:** What happens when a wire transfer is flagged for review?
**Expected substring:** `escalat`
**Self-eval:** 35%
**Response time:** 27s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on the provided context, the manual addresses specific scenarios where wire transfers are flagged for review, though it does not contain a comprehensive general section on wire review procedures.

Wires are automatically flagged and blocked when they involve [Section: BC-COMP-001] "Restricted Industries." Specifically, [Section: BC-COMP-001] states that "Any outbound transaction to a known crypto-fiat gateway (e.g., Coinbase, Kraken) is automatically blocked" and "Any wire to a 'Restricted
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 31

---

#### GS-012: FAIL [medium]

**Question:** What is the definition of a jumbo mortgage?
**Expected substring:** `conforming`
**Self-eval:** 92%
**Response time:** 25s
**Category:** definition

**Response (first 500 chars):**

```
A jumbo mortgage, as defined in the Sun Chip Private Bank manual, is [Section: BC-PROD-004] a first-lien mortgage on U.S. residential properties exceeding $1.5M, designed to facilitate the purchase of high-value primary residences for ultra-high-net-worth clients with ultra-strict underwriting standards.

The program establishes rigorous eligibility criteria including [Section: BC-PROD-004] a minimum down payment of 20% of the purchase price, a minimum FICO score of 740 for all signers, and a ma
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 23

---

#### GS-015: FAIL [hard]

**Question:** What documents do I need to open an account?
**Expected substring:** `identification`
**Self-eval:** 35%
**Response time:** 29s
**Category:** cross-section

**Response (first 500 chars):**

```
To open an account at Sun Chip Private Bank, you must provide several key documents during the onboarding process. [Section: 2. Eligibility and Account Standards] First, you need to demonstrate a minimum of $10,000,000.00 in liquid, unencumbered U.S. assets. [Section: BC-ELIG-002: U.S.-Only Residency and Re-verification] For identity verification, you must submit a valid U.S. Passport as your primary document, along with a current utility bill (water, power, or gas) dated within the last 30 days
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 26

---

### Passed (11)

#### GS-001: PASS [easy]

**Question:** What is the DTI limit for jumbo mortgages?
**Expected substring:** `43%`
**Self-eval:** 95%
**Response time:** 20s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The standard Debt-to-Income (DTI) ratio limit for jumbo mortgages at Sun Chip Private Bank is [Section: BC-PROD-004: Jumbo Mortgage Program] 43%. However, there is an exception available: [Section: BC-PROD-004: Jumbo Mortgage Program] DTI may be expanded to 45% if the client holds 60 or more months of PITI reserves at Sun Chip, referred to as the "High Liquidity Offset" exception.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 26

---

#### GS-003: PASS [easy]

**Question:** What are the wire transfer cutoff times?
**Expected substring:** `cutoff`
**Self-eval:** 92%
**Response time:** 24s
**Category:** direct-lookup

**Response (first 500 chars):**

```
According to Sun Chip Private Bank's wire transfer policies, the wire transfer cutoff time for same-day processing is [Section: BC-WIRE-001: Outbound Domestic Wires]. Specifically, the "Priority Window" for same-day wire processing is defined as [Section: BC-WIRE-001: Outbound Domestic Wires] 8:00 AM to 1:00 PM ET. 

Wires initiated after 1:00 PM ET are processed on the next business day unless an "Emergency After-Hours Fee" of $600.00 USD is paid [Section: BC-WIRE-001: Outbound Domestic Wires].
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-005: PASS [easy]

**Question:** What is the FDIC insurance coverage limit?
**Expected substring:** `250,000`
**Self-eval:** 92%
**Response time:** 20s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The standard FDIC insurance coverage limit is [Fact: $250,000 USD per depositor per bank]. However, Sun Chip Private Bank's Flagship Cash Account and Sweep Logic program is designed to maximize FDIC insurance coverage by distributing client deposits across a network of up to 400 partner banks, each holding up to $250,000 of the client's cash. This sweep mechanism allows Sun Chip to provide [Section: BC-PROD-001] a maximum FDIC coverage of $100,000,000.00 USD through the Insured Network. The swee
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 24

---

#### GS-006: PASS [medium]

**Question:** Can the DTI limit be exceeded for jumbo mortgages?
**Expected substring:** `45%`
**Self-eval:** 85%
**Response time:** 25s
**Category:** rule-exception

**Response (first 500 chars):**

```
Yes, the DTI limit can be exceeded for jumbo mortgages, but only under specific circumstances. [Section: BC-PROD-004: Jumbo Mortgage Program] The standard DTI cap is 43%, as stated in the policy rules. However, [Section: BC-PROD-004: Jumbo Mortgage Program] Exception E1 ("High Liquidity Offset") allows the DTI to be expanded to 45% if the client holds 60 or more months of PITI reserves at Sun Chip. This exception is the only mechanism by which the standard 43% DTI limit can be exceeded for jumbo
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 25

---

#### GS-007: PASS [medium]

**Question:** Are there any exceptions to the minimum down payment requirement?
**Expected substring:** `exception`
**Self-eval:** 85%
**Response time:** 23s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on the provided context, there are no documented exceptions to the minimum down payment requirement of 20% for the Jumbo Mortgage Program. [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that [Policy Rule R1: "Minimum down payment is 20% of the purchase price."] This requirement is stated as a definitive policy rule without any corresponding exception blocks (E1, E2, etc.) that would permit deviation from this threshold.

While the manual does contain a general [Section: BC-EXCP
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 25

---

#### GS-009: PASS [medium]

**Question:** What are the escalation levels for BSA/AML alerts?
**Expected substring:** `compliance`
**Self-eval:** 35%
**Response time:** 25s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain specific information about escalation levels for BSA/AML (Bank Secrecy Act/Anti-Money Laundering) alerts. While the document establishes a comprehensive escalation matrix framework [Section: Appendix D: Escalation Matrix], the available excerpts do not detail the particular escalation procedures, authority chains, or SLAs specific to BSA/AML alert handling. The document does reference compliance-related escalations generally, such as [Section: BC-COMP-002: S
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 29

---

#### GS-010: PASS [medium]

**Question:** What documents are needed for a jumbo mortgage application?
**Expected substring:** `tax`
**Self-eval:** 35%
**Response time:** 25s
**Category:** rule-exception

**Response (first 500 chars):**

```
For a jumbo mortgage application at Sun Chip Private Bank, the following documents are required:

**Primary Documents:**
[Section: BC-PROD-004: Jumbo Mortgage Program] requires [Section: Appendix B: Required Documents Master Checklist] "2 years of Tax Returns" and "Proof of Seasoning" for the down payment funds.

**Complete Documentation Set:**
According to [Section: BC-PROD-004: Jumbo Mortgage Program], applicants must provide:
- Prior 2 years of Tax Returns
- W-2s from the prior 2 years
- Prio
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 24

---

#### GS-011: PASS [medium]

**Question:** What does DTI stand for in lending context?
**Expected substring:** `debt-to-income`
**Self-eval:** 92%
**Response time:** 20s
**Category:** definition

**Response (first 500 chars):**

```
In the lending context, DTI stands for [Section: BC-PROD-004: Jumbo Mortgage Program] "Debt-to-Income (DTI) ratio," which represents the percentage of gross monthly income that goes toward debt payments. According to Sun Chip's jumbo mortgage program, [Section: BC-PROD-004: Jumbo Mortgage Program] "Debt-to-Income (DTI) ratio is capped at 43%." However, there is an exception available: [Section: 7. Standardized Operational Governance and Risk Mitigation for Ultra-High-Net-Worth Family Offices] "D
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 29

---

#### GS-013: PASS [medium]

**Question:** What are the fee tiers for different account types?
**Expected substring:** `fee`
**Self-eval:** 15%
**Response time:** 22s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain comprehensive information about fee tiers for different account types at Sun Chip Private Bank. The document mentions only one specific fee structure: [Section: Bank Overview and Philosophy] references a "Sub-Tier Maintenance Fee: A monthly fee of $5,000.00 USD charged to downgraded accounts." Additionally, the [Section: Money Movement] section specifies transaction-related fees, including a "Same-Day Wire Fee: $175.00 USD" and an "After-Hours Emergency Fee:
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 22

---

#### GS-014: PASS [medium]

**Question:** What interest rates apply to certificates of deposit?
**Expected substring:** `rate`
**Self-eval:** 15%
**Response time:** 17s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain information about certificates of deposit (CDs) or their interest rates at Sun Chip Private Bank. The manual covers several product offerings including [Section: BC-PROD-001: Flagship Cash Account and Sweep Logic], [Section: BC-PROD-002: Treasury Ladder Automation], [Section: BC-PROD-003: Securities-Backed Line of Credit (SBLOC)], and [Section: BC-PROD-004: Jumbo Mortgage Program], but none of these sections address CD products or CD interest rate structures
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 20

---

#### GS-016: PASS [hard]

**Question:** Compare the lending requirements for conventional vs jumbo mortgages
**Expected substring:** `jumbo`
**Self-eval:** 15%
**Response time:** 29s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided knowledge base, I can only provide information about Sun Chip Private Bank's jumbo mortgage requirements, as the context does not contain details about conventional mortgage lending standards for comparison.

Sun Chip's [Section: BC-PROD-004: Jumbo Mortgage Program] establishes specific requirements for jumbo mortgages, defined as "first-lien mortgages on U.S. residential properties exceeding $1.5M." The key lending requirements include:

**Down Payment and Credit Standards
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 26

---
