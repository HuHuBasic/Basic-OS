#!/usr/bin/env python3
"""
basic OS Activation Code Generator
Generates 1000 unique activation codes with SHA256 hashes.
Format: XXXX-XXXX-XXXX-XXXX (16 chars, uppercase alphanumeric)
Output:
  keys/activation-codes.txt    -> plaintext codes (for distribution)
  keys/codes.db                -> SHA256 hashes (for OS verification)
"""
import hashlib
import secrets
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEYS_DIR = os.path.join(BASE_DIR, "keys")
COUNT = 1000

BLOCK_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I to avoid confusion

def generate_code():
    """Generate a 4-block activation code like ABCD-EFGH-JKLM-NPQR"""
    blocks = []
    for _ in range(4):
        block = ''.join(secrets.choice(BLOCK_CHARS) for _ in range(4))
        blocks.append(block)
    return '-'.join(blocks)

def main():
    os.makedirs(KEYS_DIR, exist_ok=True)

    codes = set()
    while len(codes) < COUNT:
        codes.add(generate_code())

    codes = sorted(codes)

    # Write plaintext codes for distribution
    plain_path = os.path.join(KEYS_DIR, "activation-codes.txt")
    with open(plain_path, "w") as f:
        f.write(f"# basic OS Activation Codes - {COUNT} codes\n")
        f.write(f"# Generated for internal testing (beta)\n")
        f.write(f"#\n")
        for code in codes:
            f.write(f"{code}\n")

    # Write SHA256 hashes for OS verification
    db_path = os.path.join(KEYS_DIR, "codes.db")
    with open(db_path, "w") as f:
        f.write(f"# basic OS Activation Database\n")
        f.write(f"# SHA256 hashes of valid activation codes\n")
        f.write(f"#\n")
        for code in codes:
            h = hashlib.sha256(code.encode()).hexdigest()
            f.write(f"{h}\n")

    print(f"Generated {COUNT} activation codes.")
    print(f"  Plaintext: {plain_path}")
    print(f"  Hashes:    {db_path}")
    print(f"")
    print(f"Sample codes:")
    for code in codes[:5]:
        print(f"  {code}")
    print(f"  ...")

if __name__ == "__main__":
    main()