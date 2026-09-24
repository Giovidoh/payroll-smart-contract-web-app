// Généré depuis out/Payroll.sol/Payroll.json du dépôt payroll-smart-contract.
// Ne pas éditer à la main : régénérer avec `npm run abi`.

export const payrollAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "stablecoin",
        "type": "address",
        "internalType": "contract IERC20"
      },
      {
        "name": "reservedPayrollCycles",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "payrollIntervalInSeconds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addEmployee",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salary",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAllEmployees",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Payroll.Employee[]",
        "components": [
          {
            "name": "employeeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "salary",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAvailableAmountForWithdrawal",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEmployee",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Payroll.Employee",
        "components": [
          {
            "name": "employeeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "salary",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEmployeeExistence",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEmployeeIndex",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLastPayrollTimestamp",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPayrollInterval",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getReservedPayrollCycles",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTotalSalaries",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeEmployee",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "runPayroll",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateSalary",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newSalary",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AmountWithdrawn",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EmployeeRemoved",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FundsDeposited",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NewEmployeeAdded",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "salary",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayrollCompleted",
    "inputs": [
      {
        "name": "numberOfEmployeesPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalAmountPaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SalaryPaid",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "salary",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SalaryUpdated",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newSalary",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "oldSalary",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__DepositAmountMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__EmployeeAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__EmployeeDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__InsufficientBalanceForPayroll",
    "inputs": [
      {
        "name": "contractBalance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalSalaries",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__OnlyOwnerAndConcernedEmployeeCanAccess",
    "inputs": [
      {
        "name": "senderAddress",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__PayrollIntervalMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__SalaryMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__SalaryTransferFailed",
    "inputs": [
      {
        "name": "employeeAddress",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__SalaryUnchanged",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__TooEarlyForNextPayroll",
    "inputs": [
      {
        "name": "nextEligibleTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__TransferFromFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__WithdrawalAmountExceedsAvailableFunds",
    "inputs": [
      {
        "name": "availableFunds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Payroll__WithdrawalAmountMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Payroll__WithdrawalFailed",
    "inputs": []
  }
] as const;
