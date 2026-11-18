# Explicit identities and review-first facts

DSH runtime Agent IDs equal Session IDs, so they do not identify a character across new conversations. Every plugin asset uses explicit owner, stable assistant identity, character identity and optional story identity; Session bindings translate runtime identity into this partition. Retrieval never falls back to other characters or user-wide unfiltered facts.

A candidate's evidence distinguishes user statements, assistant fiction and inference. Only reviewed candidates become confirmed memory. Assistant-generated plot is a story fact at most, never a real user fact. The alternative automatic global summary is easier to implement but would mix scopes and claims, directly harming the project's outcome.

Status: accepted; new sharing or automatic activation requires a later ADR and regression evidence.
