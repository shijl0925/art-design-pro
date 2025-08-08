<template>
  <div v-bind="attrs">
    <div class="page-content" id="table-full-screen">
      <!-- 表格头部 -->
      <ArtTableHeader
        :columnList="columnOptions"
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
      >
        <template #left>
          <ElButton
            @click="showMenuModal('add-menu-level1', null, true)"
            v-ripple
            v-permission="'System:Menu:Create'"
          >
            添加菜单
          </ElButton>
          <ElButton @click="toggleExpand">
            {{ isExpanded ? '折叠全部' : '展开全部' }}
          </ElButton>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        :data="tableData"
        :columns="columns"
        :loading="isLoading"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :layout="{ marginTop: 10 }"
        :show-pagination="false"
      />

      <!-- 引用菜单弹窗组件 -->
      <menu-info ref="menuModalRef" @refresh="refreshMenuList" @success="refreshMenuList" />
      <el-dialog
        :title="dialogTitle"
        v-model="dialogVisible"
        width="700px"
        align-center
        :close-on-click-modal="false"
      >
        <!-- 内容不变... -->
      </el-dialog>

      <!-- 添加/编辑权限的弹窗 -->
      <el-dialog
        :title="isEditingAuth ? '编辑权限' : '添加权限'"
        v-model="authFormVisible"
        width="500px"
        append-to-body
        :close-on-click-modal="false"
      >
        <!-- 内容不变... -->
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, computed, h, useAttrs } from 'vue'
  import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
  import { getAllMenu, deleteMenu } from '@/api/system/menu'
  import { ApiStatus } from '@/utils/http/status'
  import { useTable } from '@/composables/useTable'
  import menuInfo from './modal/menuInfo.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { formatMenuTitle } from '@/router/utils/utils'
  import { format_datetime } from '@/utils/date'
  import { AppRouteRecord } from '@/types'
  import { op } from '@/utils/permission'
  import { MENU } from '@/utils/perms'

  const attrs = useAttrs()
  const tableRef = ref()
  const isExpanded = ref(false) // 默认全部收起

  const menuModalRef = ref()

  // 构建菜单类型标签
  const buildMenuTypeTag = (type: string) => {
    if (type === 'catalog') {
      return 'info'
    } else if (type === 'menu') {
      return 'success'
    } else if (type === 'button') {
      return 'primary'
    } else {
      return 'warning'
    }
  }

  // 构建菜单类型文本
  const buildMenuTypeText = (type: string) => {
    return type === 'catalog'
      ? '目录'
      : type === 'menu'
        ? '菜单'
        : type === 'button'
          ? '按钮'
          : '其他'
  }

  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value && tableData.value) {
        // 递归处理所有行的展开/收起状态
        const processRows = (rows: AppRouteRecord[]) => {
          rows.forEach((row) => {
            if (row.children && row.children.length > 0) {
              tableRef.value.elTableRef.toggleRowExpansion(row, isExpanded.value)
              processRows(row.children)
            }
          })
        }
        processRows(tableData.value)
      }
    })
  }

  // 使用 useTable 管理表格数据
  const tableApi = useTable<any>({
    core: {
      apiFn: getAllMenu,
      immediate: true,
      columnsFactory: () => [
        {
          prop: 'meta.title',
          label: '菜单名称',
          minWidth: 100,
          formatter: (row: any) => formatMenuTitle(row.meta?.title)
        },
        {
          prop: 'type',
          label: '类型',
          align: 'center',
          formatter: (row: any) =>
            h(
              ElTag,
              { type: buildMenuTypeTag(row.type) },
              { default: () => buildMenuTypeText(row.type) }
            )
        },
        {
          prop: 'authCode',
          label: '权限标识',
          align: 'center'
        },
        {
          prop: 'path',
          label: '路由地址',
          align: 'center'
        },
        {
          prop: 'component',
          label: '页面组件',
          align: 'center'
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
          width: 180,
          fixed: 'right',
          formatter: (row: any) =>
            h('div', { class: 'operation-column-container' }, [
              op(
                MENU.CREATE,
                h(ArtButtonTable, {
                  type: 'add',
                  style: 'margin-right: 8px;',
                  onClick: () => showMenuModal('add-menu-level2', row)
                })
              ),
              op(
                MENU.UPDATE,
                h(ArtButtonTable, {
                  type: 'edit',
                  style: 'margin-right: 8px;',
                  onClick: () => handleEdit('edit', row)
                })
              ),
              op(
                MENU.DELETE,
                h(ArtButtonTable, {
                  type: 'delete',
                  onClick: () => delMenu(row.id)
                })
              )
            ])
        }
      ]
    },
    transform: {
      responseAdapter: (response) => {
        if (response.code === ApiStatus.success) {
          return {
            data: response.data || [],
            total: response.data?.length || 0,
            current: 1,
            size: response.data?.length || 0
          }
        } else {
          throw new Error(response.message || '获取菜单列表失败')
        }
      }
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message)
    }
  })

  const { tableData, isLoading, columns, columnChecks, refreshAll } = tableApi

  // 列配置选项
  const columnOptions = [
    { label: '名称', prop: 'name' },
    { label: '类型', prop: 'type' },
    { label: '路由', prop: 'path' },
    { label: '权限标识', prop: 'authCode' },
    { label: '状态', prop: 'status' },
    { label: '操作', prop: 'operation' }
  ]

  // 刷新表格数据
  const handleRefresh = () => {
    refreshAll()
  }

  // 刷新菜单列表（兼容原有方法）
  const refreshMenuList = async () => {
    await refreshAll()
  }

  const showMenuModal = (type: string, row?: any, lock: boolean = false) => {
    menuModalRef.value.showModel(type, row, lock)
  }

  const handleEdit = (type: string, row: any) => {
    showMenuModal('menu', row, true)
  }

  const delMenu = async (id: string) => {
    try {
      await ElMessageBox.confirm('确定要删除该菜单吗？删除后无法恢复', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      const res = await deleteMenu(id)
      if (res.code === ApiStatus.success) {
        ElMessage.success('删除成功')
      } else {
        console.error(res.message)
        ElMessage.error('删除失败: ' + res.message)
      }
      await refreshMenuList()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }

  // 兼容原有的 dialogVisible 等变量（如果弹窗组件需要）
  const dialogVisible = ref(false)
  const authFormVisible = ref(false)
  const dialogTitle = computed(() => '菜单详情')
  const isEditingAuth = ref(false)

  onMounted(async () => {
    // useTable 会自动加载数据，这里不需要手动调用
  })
</script>

<style lang="scss" scoped>
  .page-content {
    .svg-icon {
      width: 1.8em;
      height: 1.8em;
      overflow: hidden;
      vertical-align: -8px;
      fill: currentcolor;
    }

    :deep(.small-btn) {
      height: 30px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
    }

    .auth-list-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .operation-column-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  .item {
    margin-top: 10px;
    margin-right: 30px;
  }

  .el-col2 {
    display: flex;
    gap: 10px;
  }
</style>
