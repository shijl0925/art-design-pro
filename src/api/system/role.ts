import api, { ApiResponse } from '@/api/client'

// 获取角色列表
async function getRoleList(params?: any) {
  return api.get<ApiResponse<ApiResponse>>({
    url: '/api/v1/rbac/roles',
    params
  })
}

async function addRole(data: any) {
  return api.post<ApiResponse>({
    url: '/api/v1/rbac/roles',
    data
  })
}

async function updateRole(options: { id: string; data: any }) {
  return api.put<ApiResponse>({
    url: `/api/v1/rbac/roles/${options.id}`,
    data: options.data
  })
}

async function deleteRole(id: string) {
  return api.del<ApiResponse>({
    url: `/api/v1/rbac/roles/${id}`
  })
}

async function updateRolePermissions(options: { id: string; data: any }) {
  return api.put<ApiResponse>({
    url: `/api/v1/rbac/roles/${options.id}/permissions`,
    data: options.data
  })
}

export { addRole, updateRole, updateRolePermissions, deleteRole, getRoleList }
