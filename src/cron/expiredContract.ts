import application from "../application";
import {
  Contract,
  ContractStatus,
  ContractTypes,
} from "../database/entities/Contract";
import { Not } from "typeorm";

export const expiredContract = async () => {
  const contractRepository =
    application.instance.locals.dataSource.getRepository(Contract);

  const contracts: Contract[] = await contractRepository.find({
    relations: ["employee"],
    where: {
      status: ContractStatus.ACTIVE,
      contractType: Not(ContractTypes.OFFICIAL_INDEFINITELY),
    },
  });

  if (contracts.length > 0) {
    const update: Contract[] = contracts
      .filter(
        (contract: Contract) =>
          new Date(contract.endDate).getTime() < new Date().getTime()
      )
      .map((contract: Contract) => {
        contract.status = ContractStatus.EXPIRED;
        return contract;
      });

    await contractRepository.save(update);
  }
};
