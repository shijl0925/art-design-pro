<template>
  <div class="role-page art-full-height" id="table-full-screen">
    <!-- 搜索栏 -->
    <ArtSearchBar
      v-model:filter="searchState"
      :items="searchItems"
      @reset="resetSearch"
      @search="searchData"
    />

    <ElCard shadow="never" class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" @refresh="refresh">
        <template #left>
          <ElButton @click="showDialog('add')" v-permission="'System:Menu:Create'"
            >添加角色</ElButton
          >
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :table-config="{ rowKey: 'id' }"
        :layout="{ marginTop: 10 }"
      />

      <!-- 角色弹窗 -->
      <ElDialog
        v-model="dialogVisible"
        :title="dialogType === 'add' ? '新增角色' : '编辑角色'"
        width="500px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
          <ElFormItem label="角色名称" prop="name">
            <ElInput v-model="form.name" placeholder="请输入角色名称" />
          </ElFormItem>
          <ElFormItem label="角色编码" prop="code">
            <ElInput v-model="form.code" placeholder="请输入角色编码" />
          </ElFormItem>
          <ElFormItem label="描述" prop="remark">
            <ElInput v-model="form.remark" type="textarea" :rows="3" placeholder="请输入角色描述" />
          </ElFormItem>
          <ElFormItem label="启用">
            <ElSwitch v-model="form.status" :active-value="1" :inactive-value="2" />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="dialog-footer">
            <ElButton @click="dialogVisible = false">取消</ElButton>
            <ElButton
              type="primary"
              @click="handleSubmit(formRef)"
              :loading="submitLoading"
              :disabled="submitLoading"
              >提交</ElButton
            >
          </div>
        </template>
      </ElDialog>
    </ElCard>

    <ElDialog
      v-model="permissionDialog"
      title="菜单权限"
      width="520px"
      align-center
      class="el-dialog-border"
      @close="handleClosePermissionDialog"
    >
      <ElScrollbar height="70vh">
        <ElTree
          ref="treeRef"
          :data="processedMenuList"
          show-checkbox
          node-key="id"
          :default-expand-all="isExpandAll"
          :default-checked-keys="[]"
          :props="defaultProps"
          @check="handleTreeCheck"
          :check-strictly="true"
        >
          <template #default="{ data }">
            <div style="display: flex; align-items: center">
              <span v-if="data.isAuth">
                {{ data.label }}
              </span>
              <span v-else>{{ defaultProps.label(data) }}</span>
            </div>
          </template>
        </ElTree>
      </ElScrollbar>
      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="toggleExpandAll">{{ isExpandAll ? '全部收起' : '全部展开' }}</ElButton>
          <ElButton @click="toggleSelectAll" style="margin-left: 8px">{{
            isSelectAll ? '取消全选' : '全部选择'
          }}</ElButton>
          <ElButton type="primary" @click="savePermission">保存</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, h, nextTick } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ElTag } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { format_datetime } from '@/utils/date'
  import { getAllMenu } from '@/api/system/menu'
  import { getRoleList, addRole, updateRole, deleteRole } from '@/api/system/role'
  import { useTable } from '@/composables/useTable'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  // 由于 ButtonMoreItem 仅为类型，需单独定义类型
  type ButtonMoreItem = {
    key: string | number
    label: string
    disabled?: boolean
    auth?: string
  }
  import { SearchFormItem } from '@/types'
  import { ApiStatus } from '@/utils/http/status'
  import { formatMenuTitle } from '@/router/utils/utils'
  import { op } from '@/utils/permission'
  import { ROLE } from '@/utils/perms'

  const permissionDialog = ref(false)
  const menuList = ref<any[]>([]) // 添加菜单数据状态
  const loadingMenu = ref(false) // 添加菜单加载状态
  const treeRef = ref()
  const isExpandAll = ref(true)
  const isSelectAll = ref(false)
  // 添加当前角色的权限数据
  const currentRolePermissions = ref<number[]>([])
  // 添加当前角色ID
  const currentRoleId = ref<string | null>(null)

  // 处理菜单数据，将 authList 转换为子节点
  const processedMenuList = computed(() => {
    const processNode = (node: any) => {
      const processed = { ...node }

      // 递归处理子节点
      if (processed.children) {
        processed.children = processed.children.map(processNode)
      }

      return processed
    }

    return menuList.value.map(processNode)
  })

  // 获取菜单列表数据
  const loadMenuList = async () => {
    try {
      loadingMenu.value = true
      const response = await getAllMenu()
      if (response && response.code === ApiStatus.success) {
        menuList.value = Array.isArray(response.data) ? response.data : []
      } else {
        ElMessage.error(response?.message || '获取菜单列表失败')
      }
    } catch (err) {
      console.error('获取菜单列表出错:', err)
      ElMessage.error('获取菜单列表失败')
    } finally {
      loadingMenu.value = false
    }
  }

  // 搜索表单配置项
  const searchItems: SearchFormItem[] = [
    {
      label: '角色名称',
      prop: 'name',
      type: 'input',
      config: {
        clearable: true,
        placeholder: '请输入角色名称'
      }
    },
    {
      label: '状态',
      prop: 'status',
      type: 'select',
      config: {
        clearable: true,
        placeholder: '请选择状态'
      },
      options: [
        { label: '启用', value: 1 },
        { label: '禁用', value: 2 }
      ]
    }
  ]

  // 表单数据
  const form = reactive({
    id: '',
    name: '',
    code: '',
    remark: '',
    status: 1
  })
  const dialogType = ref('add')
  const dialogVisible = ref(false)
  const submitLoading = ref(false)
  const formRef = ref<FormInstance>()

  // 表单验证规则
  const rules = reactive<FormRules>({
    name: [
      { required: true, message: '请输入角色名称', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    remark: [{ required: true, message: '请输入角色描述', trigger: 'blur' }]
  })

  // 操作按钮列表
  const actionButtons: ButtonMoreItem[] = [
    op(ROLE.UPDATE, { key: 'permission', label: '菜单权限' }),
    op(ROLE.UPDATE, { key: 'edit', label: '编辑角色' }),
    op(ROLE.DELETE, { key: 'delete', label: '删除角色' })
  ].filter(Boolean) // 过滤掉没有权限的按钮

  // useTable 适配
  const {
    columns,
    columnChecks,
    tableData: data,
    isLoading: loading,
    searchState: searchState,
    searchData: searchData,
    resetSearch: resetSearch,
    refreshAll: refresh
  } = useTable<any>({
    core: {
      apiFn: getRoleList,
      apiParams: {
        name: '',
        status: undefined
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        {
          prop: 'name',
          label: '角色名称',
          align: 'center'
        },
        {
          prop: 'code',
          label: '角色标识',
          align: 'center'
        },
        {
          prop: 'remark',
          label: '描述',
          align: 'center',
          showOverflowTooltip: true
        },
        {
          prop: 'status',
          label: '状态',
          align: 'center',
          formatter: (row: any) =>
            h(
              ElTag,
              { type: row.status === 1 ? 'primary' : 'warning' },
              { default: () => (row.status === 1 ? '启用' : '禁用') }
            )
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
          formatter: (row: any) => {
            // 如果没有任何权限，不显示按钮
            if (actionButtons.length === 0) {
              return h('div', { class: 'operation-column-container' }, [
                h('span', { style: 'color: #909399; font-size: 12px;' }, '')
              ])
            }

            return h('div', { class: 'operation-column-container' }, [
              h(ArtButtonMore, {
                list: actionButtons,
                onClick: (item: ButtonMoreItem) => buttonMoreClick(item, row)
              })
            ])
          }
        }
      ]
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message)
    }
  })

  // 操作按钮点击事件
  const buttonMoreClick = (item: ButtonMoreItem, row: any) => {
    switch (item.key) {
      case 'permission':
        showPermissionDialog(row)
        break
      case 'edit':
        showDialog('edit', row)
        break
      case 'delete':
        deleteRoleAction(row.id)
        break
    }
  }

  const showPermissionDialog = async (row?: any) => {
    // 保存当前角色ID
    if (row && row.id) {
      currentRoleId.value = row.id
    } else {
      currentRoleId.value = null
    }

    // 如果有角色数据，保存其权限信息
    if (row && row.permissions) {
      currentRolePermissions.value = Array.isArray(row.permissions) ? row.permissions : []
    } else {
      currentRolePermissions.value = []
    }
    // 显示对话框前先加载菜单数据
    await loadMenuList()
    permissionDialog.value = true

    // 在下次DOM更新后设置默认选中
    await nextTick(() => {
      setDefaultCheckedKeys()
    })
  }

  // 设置默认选中的菜单项
  const setDefaultCheckedKeys = () => {
    const tree = treeRef.value
    if (!tree) return

    // 获取所有需要选中的菜单ID
    const permissionIds = currentRolePermissions.value

    // 根据权限ID设置选中状态
    const keysToCheck: (string | number)[] = []

    // 遍历处理后的菜单列表，找出匹配的节点
    const findMatchingNodes = (nodes: any[]) => {
      nodes.forEach((node) => {
        // 如果节点ID在权限列表中，则添加到选中列表
        if (permissionIds.includes(node.id)) {
          // 使用 id 作为唯一标识
          keysToCheck.push(node.id)
        }

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          findMatchingNodes(node.children)
        }
      })
    }

    findMatchingNodes(processedMenuList.value)

    // 设置选中的键
    tree.setCheckedKeys(keysToCheck)

    // 更新全选状态
    updateSelectAllState()
  }

  // 更新全选状态
  const updateSelectAllState = () => {
    const tree = treeRef.value
    if (!tree) return

    const checkedKeys = tree.getCheckedKeys()
    const allKeys = getAllNodeKeys(processedMenuList.value)

    // 判断是否全选
    isSelectAll.value = checkedKeys.length === allKeys.length && allKeys.length > 0
  }

  const defaultProps = {
    children: 'children',
    label: (data: any) => formatMenuTitle(data.meta?.title) || ''
  }

  // 弹窗相关
  const showDialog = (type: string, row?: any) => {
    dialogType.value = type
    dialogVisible.value = true
    formRef.value?.resetFields()
    nextTick(() => {
      if (type === 'edit' && row) {
        form.id = row.id
        form.name = row.name
        form.code = row.code
        form.remark = row.remark
        form.status = row.status
      } else {
        form.id = ''
        form.name = ''
        form.code = ''
        form.remark = ''
        form.status = 1
      }
    })
  }

  // 删除角色
  const deleteRoleAction = (id: string) => {
    ElMessageBox.confirm('确定删除该角色吗？删除后无法恢复！', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        try {
          const response = await deleteRole(id)
          if (response && response.code === ApiStatus.success) {
            ElMessage.success('删除成功')
            await refresh()
          } else {
            ElMessage.error(response.message || '删除失败')
          }
        } catch (err) {
          console.error('删除角色出错:', err)
          ElMessage.error('删除失败，请稍后再试')
        }
      })
      .catch(() => {})
  }

  // 提交表单
  const handleSubmit = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate(async (valid) => {
      if (valid) {
        submitLoading.value = true
        try {
          const roleData = {
            name: form.name,
            code: form.code,
            remark: form.remark,
            status: form.status
          }
          const response =
            dialogType.value === 'add'
              ? await addRole(roleData)
              : await updateRole({ id: form.id, data: roleData })
          if (response && response.code === ApiStatus.success) {
            ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
            dialogVisible.value = false
            await refresh()
          } else {
            ElMessage.error(response.message || '操作失败')
          }
        } catch (err) {
          console.error('提交表单出错:', err)
          ElMessage.error('操作失败，请稍后再试')
        } finally {
          submitLoading.value = false
        }
      }
    })
  }

  const savePermission = async () => {
    try {
      // 检查是否有有效的角色ID
      if (!currentRoleId.value) {
        ElMessage.error('无效的角色ID')
        return
      }
      const tree = treeRef.value
      if (!tree) return

      // 在严格模式下，getCheckedKeys(false) 只获取选中的节点，不包括半选中
      const checkedKeys = tree.getCheckedKeys(false)

      // 提取需要保存的权限ID
      const permissionIds: number[] = []

      checkedKeys.forEach((key: string | number) => {
        // 如果是数字ID，直接添加
        if (typeof key === 'number') {
          permissionIds.push(key)
        }
        // 如果是字符串ID，尝试转换为数字
        else {
          {
            const menuId = parseInt(key)
            if (!isNaN(menuId) && !permissionIds.includes(menuId)) {
              permissionIds.push(menuId)
            }
          }
        }
      })

      // 去重
      const uniquePermissionIds = [...new Set(permissionIds)]
      console.log('保存的权限ID:', uniquePermissionIds)

      // 这里应该调用API保存权限
      await updateRole({
        id: currentRoleId.value,
        data: { permissions: uniquePermissionIds }
      })

      ElMessage.success('权限保存成功')
      permissionDialog.value = false

      await refresh()
    } catch (error) {
      console.error('保存权限出错:', error)
      ElMessage.error('权限保存失败')
    }
  }

  // 处理权限对话框关闭
  const handleClosePermissionDialog = () => {
    // 重置当前角色ID
    currentRoleId.value = null
    // 清理菜单列表
    menuList.value = []
    // 重置全选状态
    isSelectAll.value = false
    // 重置展开状态
    isExpandAll.value = true
  }

  const toggleExpandAll = () => {
    const tree = treeRef.value
    if (!tree) return

    // 使用store.nodesMap直接控制所有节点的展开状态
    const nodes = tree.store.nodesMap
    for (const node in nodes) {
      nodes[node].expanded = !isExpandAll.value
    }

    isExpandAll.value = !isExpandAll.value
  }

  const toggleSelectAll = () => {
    const tree = treeRef.value
    if (!tree) return

    if (!isSelectAll.value) {
      // 全选：获取所有节点的key并设置为选中
      const allKeys = getAllNodeKeys(processedMenuList.value)
      tree.setCheckedKeys(allKeys)
    } else {
      // 取消全选：清空所有选中
      tree.setCheckedKeys([])
    }

    isSelectAll.value = !isSelectAll.value
  }

  const getAllNodeKeys = (nodes: any[]): (string | number)[] => {
    const keys: (string | number)[] = []
    const traverse = (nodeList: any[]) => {
      nodeList.forEach((node) => {
        // 使用 id 作为唯一标识
        if (node.id) {
          keys.push(node.id)
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return keys
  }

  const handleTreeCheck = () => {
    updateSelectAllState()
  }
</script>

<style lang="scss" scoped>
  .role-page {
    // 添加表格容器样式
    .table-container {
      flex: 1;
      min-height: 0; // 重要：允许容器收缩
      padding: 16px; // 根据需求调整内边距
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

    .svg-icon {
      width: 1.8em;
      height: 1.8em;
      vertical-align: -8px;
      fill: currentcolor;
    }

    .operation-column-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>
