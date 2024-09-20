export type SequenceEnforcer = {
  "version": "0.1.0",
  "name": "sequence_enforcer",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "sym",
          "type": "string"
        }
      ]
    },
    {
      "name": "checkTtl",
      "accounts": [],
      "args": [
        {
          "name": "ttl",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resetSequenceNumber",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "sequenceNum",
          "type": "u64"
        }
      ]
    },
    {
      "name": "checkAndSetSequenceNumber",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "sequenceNum",
          "type": "u64"
        },
        {
          "name": "ttl",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "SequenceAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sequenceNum",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "SequenceOutOfOrder",
      "msg": "Sequence out of order"
    },
    {
      "code": 6001,
      "name": "Expired",
      "msg": "Tx mined after its expiry time"
    }
  ]
};

export const IDL: SequenceEnforcer = {
  "version": "0.1.0",
  "name": "sequence_enforcer",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "sym",
          "type": "string"
        }
      ]
    },
    {
      "name": "checkTtl",
      "accounts": [],
      "args": [
        {
          "name": "ttl",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resetSequenceNumber",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "sequenceNum",
          "type": "u64"
        }
      ]
    },
    {
      "name": "checkAndSetSequenceNumber",
      "accounts": [
        {
          "name": "sequenceAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "sequenceNum",
          "type": "u64"
        },
        {
          "name": "ttl",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "sequenceAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sequenceNum",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "SequenceOutOfOrder",
      "msg": "Sequence out of order"
    },
    {
      "code": 6001,
      "name": "Expired",
      "msg": "Tx mined after its expiry time"
    }
  ]
};
