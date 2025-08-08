/**
 * 用户管理
 */
export enum USER {
  CREATE = 'System:User:Create',
  DELETE = 'System:User:Delete',
  READ = 'System:User:List',
  UPDATE = 'System:User:Edit'
}

/**
 * 角色管理
 */
export enum ROLE {
  CREATE = 'System:Role:Create',
  DELETE = 'System:Role:Delete',
  READ = 'System:Role:List',
  UPDATE = 'System:Role:Edit'
}

/**
 * 菜单管理
 */
export enum MENU {
  CREATE = 'System:Menu:Create',
  DELETE = 'System:Menu:Delete',
  READ = 'System:Menu:List',
  UPDATE = 'System:Menu:Edit'
}

/**
 * 接口管理
 */
export enum RESOURCE {
  CREATE = 'System:Resource:Create',
  DELETE = 'System:Resource:Delete',
  READ = 'System:Resource:List',
  UPDATE = 'System:Resource:Edit'
}

/**
 * 操作日志
 */
export enum OPERATION {
  READ = 'System:Operation:List'
}
