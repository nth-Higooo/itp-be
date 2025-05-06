import { MetadataKeys } from "../utils/enums";
import { IUserPermission } from "../utils/interfaces";

const Authenticate = (
  permissions: IUserPermission[] | string = "*"
): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.AUTHENTICATE, permissions, target);
  };
};

export default Authenticate;
