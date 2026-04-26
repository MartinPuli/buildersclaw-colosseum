/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow.json`.
 */
export type Escrow = {
  "address": "BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE",
  "metadata": {
    "name": "escrow",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hackathonId"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "depositorAta",
          "writable": true
        },
        {
          "name": "vaultAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "verdictAuthority"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hackathonId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refundTo",
      "discriminator": [
        6,
        2,
        43,
        195,
        255,
        253,
        244,
        210
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "depositorAta",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "releaseTo",
      "discriminator": [
        89,
        11,
        150,
        168,
        140,
        201,
        56,
        132
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "winnerAta",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "prizeVault",
      "discriminator": [
        34,
        226,
        195,
        160,
        248,
        75,
        50,
        7
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notImplemented",
      "msg": "Not implemented yet"
    },
    {
      "code": 6001,
      "name": "alreadySettled",
      "msg": "Vault has already been settled"
    },
    {
      "code": 6002,
      "name": "badAuthority",
      "msg": "Authority does not match vault.authority"
    },
    {
      "code": 6003,
      "name": "mintMismatch",
      "msg": "Mint mismatch"
    },
    {
      "code": 6004,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    }
  ],
  "types": [
    {
      "name": "prizeVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hackathonId",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
