export const INCO_CONTEXT = `
# Inco Components
- Smart Contract Library: Encrypted data types (ebool, eaddress, euint256) and arithmetic/comparison/conditional operations.
- Confidential Compute Server (TEE): Handles all confidential operations.
- Client-side JS Library: Encryption/decryption of user inputs.

# Decryption Mechanisms
- Attested Decrypt: Cryptographic proof of decryption.
- Attested Compute: Compute off-chain + attestation.
- Attested Reveal: e.reveal() makes data public.

# Best Practices
- Always check allowance over inputs: require(msg.sender.isAllowed(value)).
- Information Leakage: Avoid deducible patterns (e.g., public prices with private amounts).
- Don't lose access: Call e.allowThis() and e.allow after operations.
- Verify intended handle when verifying attestations.
- Be careful with delegatecalls.

# Control Flow
- Use e.select() Multiplexer pattern instead of if/else for private values.
- Reverts cannot depend on private values.

# Primitives
- euint256, ebool, eaddress (handles are bytes32 identifiers).
- Operations: add, sub, mul, div, rem, and, or, xor, shr, shl, rotr, rotl.
- Comp: eq, ne, ge, gt, le, lt, min, max, not.
- Random: rand, randBounded.
- Converters: asEuint256, asEbool, asEaddress, newEuint256, newEbool, newEaddress.
- Access: allow, allowThis, reveal, isAllowed.
`;
