<template>
  <div v-bind="attrs">
    <div class="user-page art-full-height" id="table-full-screen">
      <!-- 搜索栏 -->
      <ArtSearchBar
        v-model:filter="searchState"
        :items="searchItems"
        @reset="resetSearch"
        @search="searchData"
      />

      <ElCard shadow="never" class="art-table-card">
        <!-- 表格头部 -->
        <ArtTableHeader
          :columnList="columnOptions"
          v-model:columns="columnChecks"
          @refresh="handleRefresh"
        >
          <template #left>
            <ElButton @click="showDialog('add')" v-permission="'System:User:Create'"
              >添加用户</ElButton
            >
          </template>
        </ArtTableHeader>

        <!-- 表格 -->
        <ArtTable
          :data="tableData"
          :columns="columns"
          :pagination="paginationState"
          :loading="isLoading"
          :table-config="{ rowKey: 'User.id' }"
          :layout="{ marginTop: 10 }"
          @pagination:size-change="onPageSizeChange"
          @pagination:current-change="onCurrentPageChange"
        />
      </ElCard>
    </div>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
      width="600px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm ref="formRef" :model="formData" :rules="computedRules" label-width="85px">
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="账号" prop="username">
              <ElInput
                v-model="formData.username"
                :disabled="dialogType === 'edit'"
                placeholder="请输入账号"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="用户名" prop="nickName">
              <ElInput v-model="formData.nickName" placeholder="请输入用户名" />
            </ElFormItem>
          </ElCol>
        </ElRow>

        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="密码" prop="password">
              <ElInput
                v-model="formData.password"
                type="password"
                :disabled="dialogType === 'edit'"
                show-password
                placeholder="请输入密码"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="手机号" prop="phone">
              <ElInput v-model="formData.phone" placeholder="请输入手机号" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="邮箱" prop="email">
              <ElInput v-model="formData.email" placeholder="请输入邮箱" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="角色" prop="role">
              <ElSelect
                v-model="formData.role"
                placeholder="请选择角色"
                style="width: 100%"
                multiple
                collapse-tags
                collapse-tags-tooltip
              >
                <ElOption label="请选择" :value="undefined" disabled></ElOption>
                <ElOption
                  v-for="item in roleList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                  :disabled="item.status !== 1"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="启用">
              <ElSwitch v-model="formData.status" :active-value="1" :inactive-value="2" />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSubmit">确定</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 修改密码弹窗 -->
    <ElDialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="500px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm
        ref="passwordFormRef"
        :model="passwordFormData"
        :rules="passwordRules"
        label-width="80px"
      >
        <ElFormItem label="旧密码" prop="oldPassword">
          <ElInput
            v-model="passwordFormData.oldPassword"
            type="password"
            show-password
            placeholder="请输入旧密码"
          />
        </ElFormItem>

        <ElFormItem label="新密码" prop="newPassword">
          <ElInput
            v-model="passwordFormData.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </ElFormItem>

        <ElFormItem label="确认密码" prop="confirmPassword">
          <ElInput
            v-model="passwordFormData.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="passwordDialogVisible = false">取 消</ElButton>
          <ElButton type="primary" @click="handlePasswordSubmit">确 定</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, nextTick, computed, h, onMounted, useAttrs } from 'vue'
  import { getRoleList } from '@/api/system/role'
  import {
    getUserList,
    updateUser,
    deleteUser,
    addUser,
    updateUserPassword
  } from '@/api/system/user'
  import { ElTag, FormInstance } from 'element-plus'
  import { ElMessageBox, ElMessage, ElButton } from 'element-plus'
  import { ApiStatus } from '@/utils/http/status'
  import { useTable } from '@/composables/useTable'
  import { SearchFormItem } from '@/types'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { format_datetime } from '@/utils/date'
  import { op } from '@/utils/permission'
  import { USER } from '@/utils/perms'

  const attrs = useAttrs()
  // 状态变量
  const dialogType = ref('add')
  const dialogVisible = ref(false)
  // useTable 适配
  const tableApi = useTable<any>({
    core: {
      apiFn: getUserList,
      apiParams: {
        page: 1,
        pageSize: 10,
        nickName: '',
        username: '',
        phone: '',
        email: '',
        role_id: undefined
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'nickName',
          label: '用户名',
          align: 'center',
          formatter: (row: any) => row.nickName || ''
        },
        {
          prop: 'username',
          label: '账号',
          align: 'center',
          formatter: (row: any) => row.username || ''
        },
        {
          prop: 'phone',
          label: '手机号',
          align: 'center',
          formatter: (row: any) => row.phone || ''
        },
        {
          prop: 'email',
          label: '邮箱',
          align: 'center',
          formatter: (row: any) => row.email || ''
        },
        {
          prop: 'role_name',
          label: '角色',
          align: 'center',
          formatter: (row: any) => {
            // 如果 row.roles 是数组，则显示多个角色
            if (Array.isArray(row.roles)) {
              return row.roles.join(', ')
            }
            return row.roles || ''
          }
        },
        {
          prop: 'status',
          label: '状态',
          align: 'center',
          formatter: (row: any) =>
            h(ElTag, { type: getTagType(row.status) }, { default: () => buildTagText(row.status) })
        },
        {
          prop: 'createTime',
          label: '创建时间',
          align: 'center',
          formatter: (row: any) => format_datetime(row.createTime)
        },
        {
          prop: 'operation',
          label: '操作',
          align: 'center',
          width: 200,
          fixed: 'right',
          formatter: (row: any) =>
            h('div', { class: 'operation-column-container' }, [
              op(
                USER.UPDATE,
                h(ArtButtonTable, {
                  type: 'edit',
                  style: 'margin-right: 8px;',
                  onClick: () => showDialog('edit', row)
                })
              ),
              op(
                USER.UPDATE,
                h(ArtButtonTable, {
                  type: 'view',
                  style: 'margin-right: 8px;',
                  onClick: () => showPasswordDialog(row)
                })
              ),
              op(
                USER.DELETE,
                h(ArtButtonTable, {
                  type: 'delete',
                  onClick: () => handleDeleteUser(row)
                })
              )
            ])
        }
      ]
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message)
    }
  })

  // 修改密码弹窗状态
  const passwordDialogVisible = ref(false)
  const passwordFormRef = ref<FormInstance>()

  // 修改密码表单数据
  const passwordFormData = reactive({
    userId: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const {
    tableData,
    isLoading,
    columns,
    columnChecks,
    paginationState,
    searchState,
    searchData,
    resetSearch,
    onPageSizeChange,
    onCurrentPageChange
  } = tableApi
  const refreshAll = tableApi.refreshAll

  // 添加角色列表的响应式数据
  const roleList = ref<any[]>([])

  // 用户表单数据
  const formData = reactive({
    id: '',
    username: '',
    nickName: '',
    password: '',
    phone: '',
    email: '',
    status: 1,
    role: [] as number[]
  })

  // 搜索表单配置项
  const searchItems: SearchFormItem[] = [
    {
      label: '用户名',
      prop: 'nickName',
      type: 'input',
      elColSpan: 6, // 从8改为6，缩短显示宽度
      config: {
        clearable: true,
        placeholder: '请输入用户名'
      }
    },
    {
      label: '账号',
      prop: 'username',
      type: 'input',
      elColSpan: 6, // 从8改为6，缩短显示宽度
      config: {
        clearable: true,
        placeholder: '请输入账号'
      }
    },
    {
      label: '手机号',
      prop: 'phone',
      type: 'input',
      elColSpan: 6, // 从8改为6，缩短显示宽度
      config: {
        clearable: true,
        placeholder: '请输入手机号'
      }
    }
  ]

  // 列配置选项
  const columnOptions = [
    { label: '用户名', prop: 'User.nickName' },
    { label: '账号', prop: 'User.username' },
    { label: '手机号', prop: 'User.phone' },
    { label: '邮箱', prop: 'User.email' },
    { label: '角色', prop: 'role_name' },
    { label: '状态', prop: 'User.status' },
    { label: '操作', prop: 'operation' }
  ]

  // 表单实例引用
  const formRef = ref<FormInstance>()

  // 刷新表格数据
  const handleRefresh = () => {
    refreshAll()
  }

  // 用户列表数据已由 useTable 管理

  // 加载角色列表数据
  const loadRoleList = async () => {
    try {
      const res = await getRoleList()
      if (res && res.code === ApiStatus.success) {
        roleList.value = res.data?.data || res.data || []
      } else {
        ElMessage.error(res.message || '获取角色列表失败')
      }
    } catch (err) {
      console.error('获取角色列表出错:', err)
      ElMessage.error('获取角色列表失败')
    }
  }

  // 分页、搜索、重置逻辑已由 useTable 管理

  // 显示对话框
  const showDialog = (type: string, row?: any) => {
    dialogVisible.value = true
    dialogType.value = type

    if (type === 'edit' && row) {
      formData.id = row.id
      formData.username = row.username || ''
      formData.nickName = row.nickName
      formData.phone = row.phone || ''
      formData.email = row.email || ''
      formData.status = row.status
      formData.role = row.role
      formData.password = '' // 编辑模式下明确清空密码
    } else {
      // 添加用户时重置表单并确保状态为启用
      formData.id = ''
      formData.username = ''
      formData.nickName = ''
      formData.password = ''
      formData.phone = ''
      formData.email = ''
      formData.status = 1
      formData.role = []

      // 确保下一个渲染周期状态为启用
      nextTick(() => {
        formData.status = 1
      })
    }

    // 强制重新计算验证规则
    nextTick(() => {
      if (formRef.value) {
        formRef.value.clearValidate()
      }
    })
  }

  // 处理删除用户
  const handleDeleteUser = (row: any) => {
    ElMessageBox.confirm('确定要删除该用户吗？', '删除用户', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
      .then(async () => {
        try {
          // 确保用户ID正确传递
          const userId = row.id
          if (!userId) {
            ElMessage.error('用户ID无效')
            return
          }

          const res = await deleteUser(userId)
          if (res && res.code === ApiStatus.success) {
            ElMessage.success('删除用户成功')
            await refreshAll()
          } else {
            ElMessage.error(res.message || '删除用户失败')
          }
        } catch (err) {
          console.error('删除用户出错:', err)
          ElMessage.error('删除用户失败，请稍后重试')
        }
      })
      .catch(() => {
        // 用户取消删除，不做处理
      })
  }

  // 显示修改密码弹窗
  const showPasswordDialog = (row: any) => {
    passwordDialogVisible.value = true
    passwordFormData.userId = row.id
    passwordFormData.oldPassword = ''
    passwordFormData.newPassword = ''
    passwordFormData.confirmPassword = ''

    // 清除表单验证
    nextTick(() => {
      if (passwordFormRef.value) {
        passwordFormRef.value.clearValidate()
      }
    })
  }

  // 提交密码修改
  const handlePasswordSubmit = async () => {
    if (!passwordFormRef.value) return

    await passwordFormRef.value.validate(async (valid) => {
      if (valid) {
        try {
          const res = await updateUserPassword({
            id: passwordFormData.userId,
            data: {
              oldPassword: passwordFormData.oldPassword,
              newPassword: passwordFormData.newPassword,
              confirmPassword: passwordFormData.confirmPassword
            }
          })

          if (res && res.code === ApiStatus.success) {
            ElMessage.success('密码修改成功')
            passwordDialogVisible.value = false
          } else {
            ElMessage.error(res.message || '密码修改失败')
          }
        } catch (err) {
          console.error('修改密码出错:', err)
          ElMessage.error('密码修改失败')
        }
      }
    })
  }

  const getTagType = (status: number) => {
    switch (status) {
      case 1:
        return 'primary'
      case 2:
        return 'warning'
      default:
        return 'info'
    }
  }

  const buildTagText = (status: number) => {
    if (status === 1) {
      return '启用'
    } else if (status === 2) {
      return '禁用'
    } else {
      return '未知'
    }
  }

  // 定义基本验证规则
  const baseRules = {
    username: [
      { required: true, message: '请输入账号', trigger: 'blur' },
      { min: 4, max: 20, message: '长度在 4 到 20 个字符', trigger: 'blur' }
    ],
    nickName: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
    ],
    // email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    role: [{ required: true, message: '请选择角色', trigger: 'change', type: 'array' }]
  }

  // 修改密码表单验证规则
  const passwordRules = {
    oldPassword: [
      { required: true, message: '请输入旧密码', trigger: 'blur' },
      { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
    ],
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: '请确认新密码', trigger: 'blur' },
      {
        validator: (rule: any, value: any, callback: any) => {
          if (!value) {
            callback(new Error('请再次输入新密码'))
          } else if (value !== passwordFormData.newPassword) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }

  // 根据对话框类型动态计算验证规则
  const computedRules = computed(() => {
    // 添加模式下的规则
    if (dialogType.value === 'add') {
      return {
        ...baseRules,
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
        ]
      }
    }
    // 编辑模式下的规则
    else {
      return {
        ...baseRules,
        password: [
          { required: false },
          {
            validator: (rule: any, value: any, callback: any) => {
              if (!value || value === '') {
                callback()
              } else if (value.length < 6 || value.length > 20) {
                callback(new Error('长度在 6 到 20 个字符'))
              } else {
                callback()
              }
            },
            trigger: 'blur'
          }
        ]
      }
    }
  })

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
      if (valid) {
        try {
          const submitData = { ...formData }

          // 删除 id 字段，因为 id 应该作为路径参数而不是请求体参数
          const { id, ...dataWithoutId } = submitData

          // 如果是编辑模式且密码为空，则删除密码字段
          if (dialogType.value === 'edit' && !dataWithoutId.password) {
            ;(submitData as any).password = undefined
          }

          let res
          if (dialogType.value === 'add') {
            res = await addUser(submitData)
          } else {
            res = await updateUser({
              id: id,
              data: dataWithoutId
            })
          }

          if (res && res.code === ApiStatus.success) {
            ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
            dialogVisible.value = false
            await refreshAll()
          } else {
            ElMessage.error(res.message || (dialogType.value === 'add' ? '添加失败' : '更新失败'))
          }
        } catch (err) {
          console.error('提交表单出错:', err)
          ElMessage.error(dialogType.value === 'add' ? '添加失败' : '更新失败')
        }
      }
    })
  }

  // 初始化加载角色数据
  onMounted(async () => {
    await Promise.all([loadRoleList()])
  })
</script>

<style lang="scss" scoped>
  .user-page {
    .table-container {
      flex: 1;
      min-height: 0;
      padding: 16px;
    }

    .search-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;

      .el-input {
        width: 240px;
        margin-right: 16px;
      }
    }

    .operation-column-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .user {
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 6px;
      }

      > div {
        margin-left: 10px;

        .user-name {
          font-weight: 500;
          color: var(--art-text-gray-800);
        }
      }
    }
  }

  .status-hint {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
  }
</style>
