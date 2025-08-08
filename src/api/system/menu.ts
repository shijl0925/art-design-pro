import api, { ApiResponse } from '@/api/client'

// 获取菜单列表
async function getAllMenu(params?: any) {
  return api.get<ApiResponse<ApiResponse>>({
    url: '/api/v1/rbac/menus',
    params
  })
}

async function addMenu(data: any) {
  return api.post<ApiResponse<ApiResponse>>({
    url: '/api/v1/rbac/menus',
    data
  })
}

async function updateMenu(options: { id: string; data: any }) {
  return api.put<ApiResponse<ApiResponse>>({
    url: `/api/v1/rbac/menus/${options.id}`,
    data: options.data
  })
}

async function deleteMenu(id: string) {
  return api.del<ApiResponse<ApiResponse>>({
    url: `/api/v1/rbac/menus/${id}`
  })
}

export { getAllMenu, addMenu, updateMenu, deleteMenu }
