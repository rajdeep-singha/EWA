import hre from "hardhat";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { assert, expect } from "chai";
import { parseEther } from "viem";

describe("EWA Test Cases", function () {
  async function deployEWAFixture() {
    const [owner, employer, employee1, employee2] =
      await hre.viem.getWalletClients();

    const SUPPLY = 1000000n * 10n ** 18n;
    const MINT_AMOUNT = 1000n * 10n ** 18n;

    const mockERC20 = await hre.viem.deployContract("MockERC20", [
      "MockERC20",
      "MCK",
      SUPPLY,
    ]);

    await mockERC20.write.mint([owner.account.address, MINT_AMOUNT]);
    await mockERC20.write.mint([employer.account.address, MINT_AMOUNT]);
    // await mockERC20.write.mint([employee1.account.address, MINT_AMOUNT]);
    // await mockERC20.write.mint([employee2.account.address, MINT_AMOUNT]);

    const ewa = await hre.viem.deployContract("EWA", [mockERC20.address], {
      client: { wallet: owner },
    });

    return { owner, employer, employee1, employee2, mockERC20, ewa };
  }

  describe("Employer Registration Tests", function () {
    it("Should set the correct owner and token address", async function () {
      const { owner, mockERC20, ewa } = await loadFixture(deployEWAFixture);
      expect((await ewa.read.owner()).toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
      expect((await ewa.read.token()).toLowerCase()).to.equal(
        mockERC20.address.toLowerCase()
      );
    });

    it("Should register a new employer", async function () {
      const { employer, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const employerData = await ewa.read.employers([0n]);
      expect(employerData[1].toLowerCase()).to.equal(
        employer.account.address.toLowerCase()
      );
      expect(employerData[0]).to.equal(0n);
      expect(employerData[2]).to.equal(0n);
      expect(employerData[3]).to.equal(0n);
      expect(await ewa.read.employerCount()).to.equal(1n);
    });

    it("Should revert if employer is already registered", async function () {
      const { employer, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      await expect(
        ewa.write.registerEmployer([employer.account.address], {
          account: employer.account,
        })
      ).to.be.rejectedWith("Employer already registered");
    });

    it("Should revert if employer address is zero", async function () {
      const { employer, ewa } = await loadFixture(deployEWAFixture);
      await expect(
        ewa.write.registerEmployer(
          ["0x0000000000000000000000000000000000000000"],
          {
            account: employer.account,
          }
        )
      ).to.be.rejectedWith("Invalid employer address");
    });
  });

  describe("Employee Registration Tests", function () {
    it("Should register a new employee", async function () {
      const { employer, employee1, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const SALARY = parseEther("100");
      await ewa.write.registerEmployee(
        [0n, employee1.account.address, SALARY],
        {
          account: employer.account,
        }
      );
      const employeeData = await ewa.read.employeeByAddress([
        employee1.account.address,
      ]);
      expect(employeeData[0]).to.equal(0n);
      expect(employeeData[1].toLowerCase()).to.equal(
        employee1.account.address.toLowerCase()
      );
      expect(employeeData[2]).to.equal(SALARY);
      expect(employeeData[3]).to.equal(SALARY);
      expect((await ewa.read.employers([0n]))[3]).to.equal(1n);
    });

    it("Should revert if non-employer tries to register employee", async function () {
      const { employer, employee1, employee2, ewa } = await loadFixture(
        deployEWAFixture
      );
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      await expect(
        ewa.write.registerEmployee(
          [0n, employee2.account.address, parseEther("100")],
          {
            account: employee1.account,
          }
        )
      ).to.be.rejectedWith("Only employer can register employees");
    });

    it("Should revert if employee is already registered", async function () {
      const { employer, employee1, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      await ewa.write.registerEmployee(
        [0n, employee1.account.address, parseEther("100")],
        {
          account: employer.account,
        }
      );
      await expect(
        ewa.write.registerEmployee(
          [0n, employee1.account.address, parseEther("100")],
          {
            account: employer.account,
          }
        )
      ).to.be.rejectedWith("Employee already registered");
    });

    it("Should revert if salary is zero", async function () {
      const { employer, employee1, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      await expect(
        ewa.write.registerEmployee([0n, employee1.account.address, 0n], {
          account: employer.account,
        })
      ).to.be.rejectedWith("Salary must be greater than zero");
    });
  });

  describe("Salary Payment Tests", function () {
    it("Should allow employer to deposit funds", async function () {
      const { employer, mockERC20, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      expect((await ewa.read.employers([0n]))[2]).to.equal(DEPOSIT_AMOUNT);
      expect(await mockERC20.read.balanceOf([ewa.address])).to.equal(
        DEPOSIT_AMOUNT
      );
    });

    it("Should allow employer to withdraw funds", async function () {
      const { employer, mockERC20, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      const WITHDRAW_AMOUNT = parseEther("200");
      await ewa.write.withdrawFunds([0n, WITHDRAW_AMOUNT], {
        account: employer.account,
      });
      expect((await ewa.read.employers([0n]))[2]).to.equal(
        DEPOSIT_AMOUNT - WITHDRAW_AMOUNT
      );
      expect(
        await mockERC20.read.balanceOf([employer.account.address])
      ).to.equal(parseEther("1000") - DEPOSIT_AMOUNT + WITHDRAW_AMOUNT);
    });

    it("Should allow employer to withdraw all funds", async function () {
      const { employer, mockERC20, ewa } = await loadFixture(deployEWAFixture);
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.withdrawAllFunds([0n], {
        account: employer.account,
      });
      expect((await ewa.read.employers([0n]))[2]).to.equal(0n);
      expect(
        await mockERC20.read.balanceOf([employer.account.address])
      ).to.equal(parseEther("1000"));
    });

    it("Should revert if non-employer tries to deposit funds", async function () {
      const { employer, employee1, mockERC20, ewa } = await loadFixture(
        deployEWAFixture
      );
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employee1.account,
      });
      await expect(
        ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
          account: employee1.account,
        })
      ).to.be.rejectedWith("Only employer can deposit");
    });
  });

  describe("Early Wage Access Tests", function () {
    it("Should allow employee to access early wages with platform fee", async function () {
      const { employer, employee1, mockERC20, ewa } = await loadFixture(
        deployEWAFixture
      );
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const SALARY = parseEther("100");
      await ewa.write.registerEmployee(
        [0n, employee1.account.address, SALARY],
        {
          account: employer.account,
        }
      );
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      const REQUEST_AMOUNT = parseEther("50");
      const PLATFORM_FEE = (REQUEST_AMOUNT * 3n) / 100n;
      await ewa.write.earlyWageAccess([REQUEST_AMOUNT], {
        account: employee1.account,
      });
      expect(
        await mockERC20.read.balanceOf([employee1.account.address])
      ).to.equal(REQUEST_AMOUNT - PLATFORM_FEE);
      expect(
        (await ewa.read.employeeByAddress([employee1.account.address]))[3]
      ).to.equal(SALARY - REQUEST_AMOUNT);
      expect((await ewa.read.employers([0n]))[2]).to.equal(
        DEPOSIT_AMOUNT - REQUEST_AMOUNT
      );
      expect(await ewa.read.totalPlatformFees()).to.equal(PLATFORM_FEE);
    });

    it("Should revert if non-registered employee tries to access wages", async function () {
      const { employee1, ewa } = await loadFixture(deployEWAFixture);
      await expect(
        ewa.write.earlyWageAccess([parseEther("50")], {
          account: employee1.account,
        })
      ).to.be.rejectedWith("Employee not registered");
    });

    it("Should revert if employee requests more than remaining salary", async function () {
      const { employer, employee1, mockERC20, ewa } = await loadFixture(
        deployEWAFixture
      );
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const SALARY = parseEther("100");
      await ewa.write.registerEmployee(
        [0n, employee1.account.address, SALARY],
        {
          account: employer.account,
        }
      );
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await expect(
        ewa.write.earlyWageAccess([SALARY + 1n], {
          account: employee1.account,
        })
      ).to.be.rejectedWith("Insufficient remaining salary");
    });
  });

  describe("Platform Fees Tests", function () {
    it("Should allow owner to withdraw platform fees", async function () {
      const { owner, employer, employee1, mockERC20, ewa } = await loadFixture(
        deployEWAFixture
      );
      await ewa.write.registerEmployer([employer.account.address], {
        account: employer.account,
      });
      const SALARY = parseEther("100");
      await ewa.write.registerEmployee(
        [0n, employee1.account.address, SALARY],
        {
          account: employer.account,
        }
      );
      const DEPOSIT_AMOUNT = parseEther("500");
      await mockERC20.write.approve([ewa.address, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      await ewa.write.depositFunds([0n, DEPOSIT_AMOUNT], {
        account: employer.account,
      });
      const REQUEST_AMOUNT = parseEther("50");
      const PLATFORM_FEE = (REQUEST_AMOUNT * 3n) / 100n;
      await ewa.write.earlyWageAccess([REQUEST_AMOUNT], {
        account: employee1.account,
      });
      const ownerBalanceBefore = await mockERC20.read.balanceOf([
        owner.account.address,
      ]);
      await ewa.write.withdrawPlatformFees({ account: owner.account });
      expect(await ewa.read.totalPlatformFees()).to.equal(0n);
      expect(await mockERC20.read.balanceOf([owner.account.address])).to.equal(
        ownerBalanceBefore + PLATFORM_FEE
      );
    });

    it("Should revert if non-owner tries to withdraw platform fees", async function () {
      const { employer, ewa } = await loadFixture(deployEWAFixture);
      await expect(
        ewa.write.withdrawPlatformFees({ account: employer.account })
      ).to.be.rejectedWith("Caller is not the owner");
    });

    it("Should revert if no platform fees to withdraw", async function () {
      const { owner, ewa } = await loadFixture(deployEWAFixture);
      await expect(
        ewa.write.withdrawPlatformFees({ account: owner.account })
      ).to.be.rejectedWith("No fees to withdraw");
    });
  });
});
