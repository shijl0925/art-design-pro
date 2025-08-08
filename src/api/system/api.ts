import api, { ApiResponse } from '@/api/client'

async function getAllResource(params?: any) {
  return api.get<ApiResponse<ApiResponse>>({
    url: '/api/v1/rbac/resources',
    params
  })
}

async function addResource(data: any) {
  return api.post<ApiResponse<ApiResponse>>({
    url: '/api/v1/rbac/resources',
    data
  })
}

async function updateResource(options: { id: string; data: any }) {
  return api.put<ApiResponse<ApiResponse>>({
    url: `/api/v1/rbac/resources/${options.id}`,
    data: options.data
  })
}

async function deleteResource(id: string) {
  return api.del<ApiResponse<ApiResponse>>({
    url: `/api/v1/rbac/resources/${id}`
  })
}

export { getAllResource, addResource, updateResource, deleteResource }
