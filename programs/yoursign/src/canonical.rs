// Canonical message reconstruction. MUST byte-for-byte match what
// `@yoursign/agent-sdk` produces in TypeScript. Any drift = on-chain
// ed25519 verification fails.

pub fn canonical_delegation_message(
    principal_b58: &str,
    agent_b58: &str,
    tools_csv: &str,
    documents_clause: &str,
    spend_cap_micro_usdc: u64,
    expires_at_iso: &str,
    nonce_hex: &str,
) -> String {
    let mut s = String::with_capacity(256);
    s.push_str("YourSign Agent Delegation v1\n");
    s.push_str("Principal: ");
    s.push_str(principal_b58);
    s.push('\n');
    s.push_str("Agent: ");
    s.push_str(agent_b58);
    s.push('\n');
    s.push_str("Scope:\n");
    s.push_str("  Tools: ");
    s.push_str(tools_csv);
    s.push('\n');
    s.push_str("  Documents: ");
    s.push_str(documents_clause);
    s.push('\n');
    s.push_str("  SpendCap (USDC, micro): ");
    s.push_str(&spend_cap_micro_usdc.to_string());
    s.push('\n');
    s.push_str("  Expires (UTC): ");
    s.push_str(expires_at_iso);
    s.push('\n');
    s.push_str("Nonce: ");
    s.push_str(nonce_hex);
    s.push('\n');
    s
}

pub fn canonical_action_message(
    delegation_id_hex: &str,
    tool_id: &str,
    target_id_hex: &str,
    timestamp_iso: &str,
    nonce_hex: &str,
) -> String {
    let mut s = String::with_capacity(192);
    s.push_str("YourSign Agent Action v1\n");
    s.push_str("Delegation: ");
    s.push_str(delegation_id_hex);
    s.push('\n');
    s.push_str("Action: ");
    s.push_str(tool_id);
    s.push('\n');
    s.push_str("Target: ");
    s.push_str(target_id_hex);
    s.push('\n');
    s.push_str("Timestamp (UTC): ");
    s.push_str(timestamp_iso);
    s.push('\n');
    s.push_str("Nonce: ");
    s.push_str(nonce_hex);
    s.push('\n');
    s
}

pub fn canonical_revoke_message(delegation_id_hex: &str, nonce_hex: &str) -> String {
    let mut s = String::with_capacity(96);
    s.push_str("YourSign Agent Revoke v1\n");
    s.push_str("Delegation: ");
    s.push_str(delegation_id_hex);
    s.push('\n');
    s.push_str("Nonce: ");
    s.push_str(nonce_hex);
    s.push('\n');
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delegation_message_layout() {
        let m = canonical_delegation_message(
            "AaAa1111111111111111111111111111111111111111",
            "BbBb2222222222222222222222222222222222222222",
            "sign_document,verify",
            "any",
            0,
            "2026-06-07T12:00:00Z",
            &"00".repeat(32),
        );
        assert_eq!(
            m,
            concat!(
                "YourSign Agent Delegation v1\n",
                "Principal: AaAa1111111111111111111111111111111111111111\n",
                "Agent: BbBb2222222222222222222222222222222222222222\n",
                "Scope:\n",
                "  Tools: sign_document,verify\n",
                "  Documents: any\n",
                "  SpendCap (USDC, micro): 0\n",
                "  Expires (UTC): 2026-06-07T12:00:00Z\n",
                "Nonce: 0000000000000000000000000000000000000000000000000000000000000000\n",
            )
        );
    }

    #[test]
    fn revoke_message_layout() {
        let m = canonical_revoke_message(&"aa".repeat(16), &"bb".repeat(32));
        assert!(m.starts_with("YourSign Agent Revoke v1\n"));
        assert!(m.ends_with('\n'));
    }
}
