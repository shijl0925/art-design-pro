import api from '@/api/client'
import { ApiResponse } from '@/api/client'

// 获取用户列表
async function getUserList(params: Api.Common.PaginatingSearchParams) {
  return api.get<Api.User.UserListData>({
    url: '/api/v1/auth/users',
    params
  })
}

// 添加用户
async function addUser(data: any) {
  return api.post<ApiResponse<ApiResponse>>({
    url: '/api/v1/auth/users',
    data
  })
}

// 修改用户
async function updateUser(options: { id: string; data: any }) {
  return api.put<ApiResponse<ApiResponse>>({
    url: `/api/v1/auth/users/${options.id}`,
    data: options.data
  })
}

// 删除用户
async function deleteUser(id: string) {
  return api.del<ApiResponse<ApiResponse>>({
    url: `/api/v1/auth/users/${id}`
  })
}

// 修改用户密码
async function updateUserPassword(options: { id: string; data: any }) {
  return api.put<ApiResponse<ApiResponse>>({
    url: `/api/v1/auth/users/${options.id}/reset_password`,
    data: options.data
  })
}

export { getUserList, addUser, updateUser, deleteUser, updateUserPassword }
