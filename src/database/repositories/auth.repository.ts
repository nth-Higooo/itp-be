import { IUserPermission } from "../../utils/interfaces";
import { Permission } from "../entities/Permission";
import { Role } from "../entities/Role";
import { User } from "../entities/User";

export const getRolesAndPermissionsByUser = async ({
  dataSource,
  userId,
}: any) => {
  const userRepository = dataSource.getRepository(User);
  const permissionRepository = dataSource.getRepository(Permission);

  const user = await userRepository.findOne({
    relations: ["roles"],
    where: { id: userId },
  });

  const allRoles = await Promise.all(
    (user?.roles || []).map(async (role: Role) => {
      const permissions = await permissionRepository.find({
        where: { role: { id: role.id } },
      });
      return {
        name: role.name,
        permissions: permissions.map((permission: any) => {
          const result: any = {};
          for (const key in permission) {
            if (permission[key] === true) {
              result[key] = permission[key];
            }
          }
          return {
            permission: permission.name,
            ...result,
          };
        }),
      };
    })
  );

  const userPermissions: IUserPermission[] = [];
  const allPermission: IUserPermission[] = [].concat(
    ...allRoles.map((role: any) => role.permissions)
  );
  for (let i = 0; i < allPermission.length; i++) {
    let exist = userPermissions.findIndex(
      (item: IUserPermission) => item.permission === allPermission[i].permission
    );
    if (exist >= 0) {
      userPermissions[exist] = {
        ...userPermissions[exist],
        ...allPermission[i],
      };
    } else {
      userPermissions.push(allPermission[i]);
    }
  }
  return {
    roles: allRoles.map((role) => role.name),
    permissions: userPermissions,
  };
};
