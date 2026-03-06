# Bank Policy Improvement Questions

This document contains extracted reasons and questions used for improving bank policy documents.

## Tier: HIGH IMPACT

### Item 1

#### Reason
> The 60-minute Verified Mode creates a potential attack surface where an attacker who gains access during this window could execute high-value transactions without re-authentication. This contradicts the stated zero-trust principle and requires clarification on session monitoring, behavioral analytics, or transaction velocity limits during Verified Mode.

#### Question
How does the bank reconcile the 'Zero-Trust Architecture' philosophy with the 60-minute Verified Mode validity window granted after a successful BCCC? If a client's session is compromised within that 60-minute window, what additional controls prevent unauthorized transactions?

---

### Item 2

#### Reason
> The Shadow Limit creates a hidden control mechanism that could result in unexpected transaction rejections. Swiss banking regulations typically require clear disclosure of account limitations. This opacity could expose the bank to regulatory challenges from FINMA or client disputes, especially if transactions are declined without prior notice of the limit.

#### Question
How does Moon Banc's 'Shadow Limit' dynamic adjustment mechanism comply with Swiss consumer protection laws requiring transparent fee and limit disclosure, particularly given that clients are not informed of the specific limit values?

---

### Item 3

#### Reason
> Total key loss represents a catastrophic authentication failure that could lock clients out of their accounts indefinitely. The document requires a notarized affidavit for single key loss but does not specify the recovery path when both keys are unavailable, potentially creating a deadlock situation for legitimate clients.

#### Question
What is the operational procedure if a client loses both their Primary and Vaulted Backup FIDO2 keys simultaneously (e.g., due to a house fire or theft)? The document mentions a 72-hour Global Freeze for key removal but does not address total key loss scenarios.

---

### Item 4

#### Reason
> The requirement for physical wet-ink signatures from two Managing Partners for exceptions over 20M CHF or AML deviations could create critical delays in emergency situations. Modern banking regulations increasingly accept digital signatures with proper authentication. This policy may conflict with business continuity requirements and could expose the bank to liability if client interests are harmed by inability to execute urgent transactions.

#### Question
What is the legal enforceability of the 'Cantonal Override' wet-ink signature requirement in an emergency situation where Managing Partners are physically unavailable (e.g., natural disaster, pandemic lockdown), and does this create operational risk for time-sensitive client needs?

---

### Item 5

#### Reason
> This represents a potential policy conflict where the margin call cure period (4 hours) may be operationally impossible to satisfy if it occurs late in the business day due to wire transfer cut-off times. This could force premature liquidation of client assets even when the client has sufficient liquidity in external accounts, potentially causing unnecessary losses and client disputes.

#### Question
How does the 4-hour margin call cure period in MB-PROD-001 interact with the 11:00 AM CET wire transfer cut-off time in MB-TRANS-001, and what happens if a margin call occurs at 10:00 AM requiring immediate liquidation but the client needs to wire funds that won't arrive until T+1?

---

### Item 6

#### Reason
> Clients with significant wealth in illiquid assets may have volatile liquid positions due to capital calls, tax payments, or market fluctuations. The 30-day Cure Window may be insufficient for clients to liquidate illiquid assets without incurring significant losses. This could lead to forced account closures for otherwise wealthy clients, potentially creating reputational risk for the bank.

#### Question
The document states that 'Assets held in real estate, private equity, jewelry, or cryptocurrency are excluded from the $10M minimum calculation' (BC-ELIG-001 R2). How does the bank verify that a client's liquid assets remain above $10M if the client's net worth is primarily in excluded asset classes and they experience a temporary liquidity crunch?

---

### Item 7

#### Reason
> The biometric authentication system creates a unique challenge for estate administration since palm vein patterns cannot be transferred and Power of Attorney terminates at death. The document doesn't address how executors or heirs access accounts, potentially creating significant delays in estate settlement and conflicts with Swiss inheritance law requirements for timely asset distribution to legal heirs.

#### Question
What is the succession and inheritance protocol when a primary account holder dies and The Slate biometric device is biologically tied to the deceased, particularly given that the 'Proxy Signer' exception requires Power of Attorney which terminates upon death?

---

## Tier: MEDIUM IMPACT

### Item 1

#### Reason
> Satellite internet services increasingly route traffic through international ground stations for efficiency, which could cause false positives for the 48-hour foreign IP trigger. This could inadvertently place legitimate U.S.-based clients into Restricted Mode, disrupting their access. The document's 'Travel Registry' exception requires 48-hour advance notice, which may not be practical for satellite internet users.

#### Question
How does the bank handle the 'International Anomaly Mode' trigger for clients who use satellite internet (e.g., Starlink) which may route traffic through foreign ground stations, causing IP geolocation to appear outside the U.S. despite the client being physically in the U.S.?

---

### Item 2

#### Reason
> The Deep Freeze policy imposes a 72-hour hold on transfers to new beneficiaries, which may conflict with PSD2 regulations requiring faster payment execution for SEPA transfers. While the policy aims to prevent fraud, it could expose Moon Banc to regulatory penalties from EU authorities or create competitive disadvantages versus EU-based banks that must comply with faster payment mandates.

#### Question
Does the 72-hour 'Deep Freeze' on new beneficiary IBANs in MB-TRANS-001 comply with EU Payment Services Directive 2 (PSD2) requirements for payment execution timeframes, particularly for SEPA transfers which mandate D+1 execution?

---

### Item 3

#### Reason
> Multi-person ceremonies are designed to prevent single points of failure, but if all participants are employees of the same organization, they may be subject to internal pressure, legal compulsion (e.g., court orders), or coordinated attacks. The document does not specify whether participants must be from independent organizations or jurisdictions, which is critical for true decentralization of custody risk.

#### Question
The narrative section on digital asset custody recommends MPC with FIPS 140-2 Level 3 HSMs, but how does the bank ensure that the 'geographically distributed participants' required for cold storage ceremonies are not subject to coercion or collusion, especially if they are all employees of the same custody provider?

---

