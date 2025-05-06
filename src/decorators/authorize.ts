import { MetadataKeys } from "../utils/enums";
import { IAuthorize, IUserPermission } from "../utils/interfaces";

const Authorize = (
  permissions: IUserPermission[] | string = "*"
): MethodDecorator => {
  return (target, propertyKey) => {
    const controllerClass = target.constructor;

    const authorizes: IAuthorize[] = Reflect.hasMetadata(
      MetadataKeys.AUTHORIZE,
      controllerClass
    )
      ? Reflect.getMetadata(MetadataKeys.AUTHORIZE, controllerClass)
      : [];

    authorizes.push({
      permissions,
      handlerName: propertyKey,
    });

    Reflect.defineMetadata(MetadataKeys.AUTHORIZE, authorizes, controllerClass);
  };
};

export default Authorize;
