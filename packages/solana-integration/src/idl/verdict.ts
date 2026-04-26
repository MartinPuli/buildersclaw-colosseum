/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/verdict.json`.
 */
export type Verdict = {
  "address": "FPp9mSTjVPXgyVMowMj6zETk9PQdNPMTkFMscetjAdKm",
  "metadata": {
    "name": "verdict",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initHackathon",
      "discriminator": [
        123,
        191,
        184,
        85,
        41,
        41,
        126,
        68
      ],
      "accounts": [
        {
          "name": "sponsor",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  99,
                  107,
                  97,
                  116,
                  104,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "prizeVault"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "judges",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "threshold",
          "type": "u8"
        },
        {
          "name": "deadline",
          "type": "i64"
        }
      ]
    },
    {
      "name": "markRefundable",
      "discriminator": [
        185,
        115,
        187,
        59,
        193,
        8,
        197,
        87
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "settleVerdict",
      "discriminator": [
        89,
        200,
        163,
        124,
        96,
        26,
        94,
        118
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "writable": true
        },
        {
          "name": "verdictAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  100,
                  105,
                  99,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "hackathon"
              }
            ]
          }
        },
        {
          "name": "prizeVault",
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
          "name": "escrowProgram",
          "address": "BksBCTjhUJgZQsfqaBAFXHkLrpG537J9UCBzBguSWZHE"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "submitBallot",
      "discriminator": [
        139,
        9,
        211,
        17,
        108,
        214,
        40,
        241
      ],
      "accounts": [
        {
          "name": "judge",
          "writable": true,
          "signer": true
        },
        {
          "name": "hackathon",
          "writable": true
        },
        {
          "name": "ballot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "hackathon"
              },
              {
                "kind": "account",
                "path": "judge"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "winnerAgent",
          "type": "pubkey"
        },
        {
          "name": "scoreRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "reasoningUri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "hackathonAccount",
      "discriminator": [
        241,
        117,
        47,
        213,
        19,
        95,
        64,
        92
      ]
    },
    {
      "name": "judgeBallot",
      "discriminator": [
        233,
        230,
        243,
        202,
        70,
        232,
        181,
        152
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6001,
      "name": "alreadySettled",
      "msg": "Already settled"
    },
    {
      "code": 6002,
      "name": "wrongStatus",
      "msg": "Wrong status"
    },
    {
      "code": 6003,
      "name": "notAJudge",
      "msg": "Caller is not in the judges list"
    },
    {
      "code": 6004,
      "name": "thresholdNotReached",
      "msg": "Threshold not reached for any single winner"
    },
    {
      "code": 6005,
      "name": "reasoningTooLong",
      "msg": "Reasoning URI exceeds max length"
    },
    {
      "code": 6006,
      "name": "tooManyJudges",
      "msg": "Too many judges (max 7)"
    },
    {
      "code": 6007,
      "name": "badThreshold",
      "msg": "Threshold must be > 0 and <= judges.len()"
    },
    {
      "code": 6008,
      "name": "badDeadline",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6009,
      "name": "gracePeriodActive",
      "msg": "Deadline + grace period not yet reached"
    }
  ],
  "types": [
    {
      "name": "hackathonAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "prizeVault",
            "type": "pubkey"
          },
          {
            "name": "judges",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "threshold",
            "type": "u8"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "verdict",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "judgeBallot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hackathon",
            "type": "pubkey"
          },
          {
            "name": "judge",
            "type": "pubkey"
          },
          {
            "name": "winnerAgent",
            "type": "pubkey"
          },
          {
            "name": "scoreRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reasoningUri",
            "type": "string"
          },
          {
            "name": "signedAt",
            "type": "i64"
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
