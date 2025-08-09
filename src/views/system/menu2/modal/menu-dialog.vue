<template>
  <ElDialog v-model="dialogVisible" width="700px" align-center :close-on-click-modal="false">
    <template #header>
      <div class="dialog-title-with-help">
        <span>{{ dialogTitle }}</span>
        <ElTooltip effect="dark" :content="helpContent" placement="top">
          <ElIcon class="help-icon" @click="showHelp"><QuestionFilled /></ElIcon>
        </ElTooltip>
      </div>
    </template>
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="85px">
      <ElFormItem label="菜单类型">
        <ElRadioGroup v-model="form.type" :disabled="isEdit">
          <ElRadioButton value="catalog">目录</ElRadioButton>
          <ElRadioButton value="menu">菜单</ElRadioButton>
          <ElRadioButton value="button">按钮</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="菜单名称" prop="name">
            <ElInput v-model="form.name" placeholder="菜单名称"></ElInput>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="路由地址" prop="path">
            <ElInput v-model="form.path" placeholder="路由地址"></ElInput>
          </ElFormItem>
        </ElCol>
      </ElRow>
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="标题" prop="meta.title">
            <ElInput v-model="form.meta.title" placeholder="标题"></ElInput>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="图标" prop="meta.icon">
            <ArtIconSelector v-model="form.meta.icon" :iconType="iconType" width="229px" />
          </ElFormItem>
        </ElCol>
      </ElRow>
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="菜单排序" prop="meta.order" style="width: 100%">
            <ElInputNumber
              v-model="form.meta.order"
              style="width: 100%"
              @change="handleChange"
              :min="1"
              controls-position="right"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="页面组件" prop="component">
            <ElInput v-model="form.component" placeholder="页面组件"></ElInput>
          </ElFormItem>
        </ElCol>
      </ElRow>
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="权限标识" prop="authCode">
            <ElInput v-model="form.authCode" placeholder="权限标识"></ElInput>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="状态" prop="status">
            <ElSwitch v-model="form.status" :active-value="1" :inactive-value="2"></ElSwitch>
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>
    <template #footer>
      <span class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitForm()">确定</ElButton>
      </span>
    </template>
  </ElDialog>

  <!-- 帮助弹窗 -->
  <ElDialog v-model="helpDialogVisible" title="菜单配置帮助" width="600px" append-to-body>
    <div class="help-content">
      <p>没有实际页面的节点菜单,确保将组件路径填成 /index/index</p>
      <p>有实际页面的菜单, 确保精确到 .vue 文件, 例如: /index/index</p>
      <p>一级节点,确保路由地址前缀带 / , 例如 /dashboard</p>
      <p>菜单标识不要重复</p>
      >
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, nextTick } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { IconTypeEnum } from '@/enums/appEnum'
  import { addMenu, updateMenu } from '@/api/system/menu'
  import { ApiStatus } from '@/utils/http/status'
  import { QuestionFilled } from '@element-plus/icons-vue'

  const emit = defineEmits(['success'])
  const dialogVisible = ref(false)
  const helpDialogVisible = ref(false)
  const helpContent = ref('点击查看帮助')
  const form = reactive({
    // 菜单
    id: 0,
    name: '',
    path: '',
    meta: {
      icon: '',
      title: '',
      order: 1
    },
    component: '',
    type: 'menu',
    authCode: '',
    pid: 0,
    status: 1
  })
  const iconType = ref(IconTypeEnum.UNICODE)
  const isEdit = ref(false)
  const lockMenuType = ref(false)
  const formRef = ref<FormInstance>()

  const rules = reactive<FormRules>({
    name: [
      { required: true, message: '请输入菜单标识', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    'meta.title': [
      { required: true, message: '请输入菜单名称', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    path: [
      {
        required: true,
        message: '请输入路由地址',
        trigger: 'blur',
        validator: (rule, value, callback) => {
          if (form.type === 'menu' && !value) {
            callback(new Error('请输入路由地址'))
          } else {
            callback()
          }
        }
      }
    ],
    component: [
      {
        required: true,
        message: '请输入组件路径',
        trigger: 'blur',
        validator: (rule, value, callback) => {
          if ((form.type === 'catalog' || form.type === 'menu') && !value) {
            callback(new Error('请输入组件路径'))
          } else {
            callback()
          }
        }
      }
    ]
  })
  const dialogTitle = computed(() => {
    const type = '菜单'
    return isEdit.value ? `编辑${type}` : `新建${type}`
  })
  const handleChange = () => {}
  const showModel = (type: string, row?: any, lock: boolean = false) => {
    dialogVisible.value = true
    isEdit.value = false
    lockMenuType.value = lock
    resetForm()
    nextTick(() => {
      if (row) {
        // 新增一级菜单
        if (type === 'add-menu-level1') {
          form.pid = 0
        } else if (type === 'add-menu-level2') {
          // 新增二级菜单
          form.pid = row.id
        } else {
          // 编辑
          // 菜单数据回显
          form.id = row.id
          form.name = row.name
          form.path = row.path
          form.meta.title = row.meta.title
          form.meta.icon = row.meta.icon
          form.component = row.component
          form.type = row.type
          form.authCode = row.authCode
          form.meta.order = row.meta.order
          form.pid = row.pid
          form.status = row.status

          isEdit.value = true
        }
      }
    })
  }

  const resetForm = () => {
    formRef.value?.resetFields()
    Object.assign(form, {
      // 菜单
      id: 0,
      name: '',
      path: '',
      meta: {
        title: '',
        icon: '',
        order: 1
      },
      component: '',
      type: 'menu',
      authCode: '',
      pid: 0,
      status: 1
    })
  }

  const submitForm = async () => {
    if (!formRef.value) return
    // 根据当前类型决定需要验证的字段
    const fieldsToValidate = ['name', 'title', 'path']
    if (form.type === 'menu') {
      fieldsToValidate.push('component')
    }
    // 先验证指定的字段
    formRef.value.validateField(fieldsToValidate, async (valid) => {
      if (!valid) return
      try {
        const formData = {
          id: form.id,
          name: form.name,
          path: form.path,
          meta: {
            title: form.meta.title,
            icon: form.meta.icon,
            order: form.meta.order
          },
          component: form.component,
          type: form.type,
          authCode: form.authCode,
          pid: form.pid,
          status: form.status
        }
        const { id, ...dataWithoutId } = formData
        console.log('id:', id)
        console.log('dataWithoutId:', dataWithoutId)
        let res
        if (isEdit.value) {
          res = await updateMenu({
            id: `${id}`,
            data: dataWithoutId
          })
        } else {
          res = await addMenu(formData)
        }
        if (res.code === ApiStatus.success) {
          ElMessage.success(`${isEdit.value ? '编辑' : '新增'}成功`)
        } else {
          ElMessage.error(`${isEdit.value ? '编辑' : '新增'}失败: ${res.message}`)
          console.log(`${isEdit.value ? '编辑' : '新增'}菜单失败`, res.message)
        }
        dialogVisible.value = false

        // 通知父组件刷新数据
        emit('success')
      } catch {
        ElMessage.error(`${isEdit.value ? '编辑' : '新增'}失败`)
        dialogVisible.value = false
      }
    })
  }
  // 对外暴露方法
  defineExpose({
    showModel
  })
  const showHelp = () => {
    helpDialogVisible.value = true
  }
</script>

<style lang="scss" scoped>
  .dialog-title-with-help {
    display: flex;
    align-items: center;

    .help-icon {
      margin-left: 8px;
      font-size: 16px;
      color: #909399;
      cursor: pointer;

      &:hover {
        color: #409eff;
      }
    }
  }

  .help-content {
    h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-weight: bold;
    }

    p {
      margin: 8px 0;
      line-height: 1.6;
    }

    ul {
      padding-left: 20px;

      li {
        margin-bottom: 4px;
      }
    }
  }
</style>
