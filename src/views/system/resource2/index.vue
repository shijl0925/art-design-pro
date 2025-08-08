<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" @refresh="refresh"> </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :layout="{ marginTop: 10 }"
        :show-pagination="false"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { h, resolveComponent } from 'vue'
  import { ElMessage } from 'element-plus'
  import { getAllResource } from '@/api/system/api'
  import { useTable } from '@/composables/useTable'

  // useTable 适配
  const {
    columns,
    columnChecks,
    tableData: tableData,
    isLoading: loading,
    refreshAll: refresh
  } = useTable<any>({
    core: {
      apiFn: getAllResource,
      apiParams: {
        page: 1,
        pageSize: 10,
        name: '',
        status: undefined
      },
      columnsFactory: () => [
        {
          prop: 'name',
          label: '名称',
          minWidth: 100
        },
        {
          prop: 'type',
          label: '类型',
          align: 'center'
        },
        {
          prop: 'method',
          label: '请求方法',
          align: 'center'
        },
        {
          prop: 'path',
          label: '路径',
          align: 'center'
        },
        {
          prop: 'code',
          label: '权限标识',
          align: 'center'
        },
        {
          prop: 'description',
          label: '描述',
          align: 'center'
        },
        {
          prop: 'status',
          label: '状态',
          align: 'center',
          formatter: (row: any) =>
            h(
              resolveComponent('ElTag'),
              { type: row.status === 1 ? 'primary' : 'warning' },
              { default: () => (row.status === 1 ? '启用' : '禁用') }
            )
        }
      ]
    },
    hooks: {
      onError: (error) => ElMessage.error(error.message)
    }
  })
</script>
