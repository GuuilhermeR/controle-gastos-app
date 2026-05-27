import {
  BankOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  RiseOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { type DragEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  createTransaction,
  deleteTransaction,
  getDashboard,
  getTransactions,
  updateTransaction,
} from './api'
import { currency, monthLabel } from './formatters'
import type { DashboardResponse, Transaction, TransactionPayload, TransactionType } from './types'

const { Header, Content } = Layout
const { Text, Title } = Typography

const categories = [
  'Salário',
  'Freelance',
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Serviços',
  'Investimentos',
  'Outros',
]

const paymentMethods = ['Pix', 'Débito', 'Crédito', 'Transferência', 'Dinheiro', 'Débito automático']
const chartColors = ['#176b87', '#c24141', '#16835d', '#d88c2d', '#6658d3', '#667085']

const typeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Entrada', value: 'Income' },
  { label: 'Despesa', value: 'Expense' },
]

type DashboardCardId =
  | 'overview'
  | 'income'
  | 'expenses'
  | 'balance'
  | 'savingsRate'
  | 'insights'
  | 'monthlyChart'
  | 'categoryChart'
  | 'balanceTrend'
  | 'transactions'

type DashboardCard = {
  title: string
  content: ReactNode
}

type FormValues = Omit<TransactionPayload, 'date'> & {
  date: dayjs.Dayjs
}

const dashboardLayoutKey = 'controle-gastos-dashboard-layout'

const defaultDashboardLayout: DashboardCardId[] = [
  'overview',
  'income',
  'expenses',
  'balance',
  'savingsRate',
  'insights',
  'monthlyChart',
  'categoryChart',
  'balanceTrend',
  'transactions',
]

const cardSpans: Record<DashboardCardId, string> = {
  overview: 'span-12',
  income: 'span-3',
  expenses: 'span-3',
  balance: 'span-3',
  savingsRate: 'span-3',
  insights: 'span-12',
  monthlyChart: 'span-8',
  categoryChart: 'span-4',
  balanceTrend: 'span-6',
  transactions: 'span-6',
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="chart-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />
    </div>
  )
}

function getInitialDashboardLayout() {
  if (typeof window === 'undefined') {
    return defaultDashboardLayout
  }

  const stored = window.localStorage.getItem(dashboardLayoutKey)
  if (!stored) {
    return defaultDashboardLayout
  }

  try {
    const parsed = JSON.parse(stored) as DashboardCardId[]
    const validCards = parsed.filter((item) => defaultDashboardLayout.includes(item))
    const missingCards = defaultDashboardLayout.filter((item) => !validCards.includes(item))
    return [...validCards, ...missingCards]
  } catch {
    return defaultDashboardLayout
  }
}

function saveDashboardLayout(layout: DashboardCardId[]) {
  window.localStorage.setItem(dashboardLayoutKey, JSON.stringify(layout))
}

function App() {
  const { message } = AntApp.useApp()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [dashboardLayout, setDashboardLayout] = useState<DashboardCardId[]>(
    getInitialDashboardLayout,
  )
  const [draftDashboardLayout, setDraftDashboardLayout] = useState<DashboardCardId[]>(
    getInitialDashboardLayout,
  )
  const [isLayoutEditing, setIsLayoutEditing] = useState(false)
  const [draggedCard, setDraggedCard] = useState<DashboardCardId | null>(null)
  const [dragOverCard, setDragOverCard] = useState<DashboardCardId | null>(null)
  const [form] = Form.useForm<FormValues>()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [transactionsData, dashboardData] = await Promise.all([
        getTransactions(),
        getDashboard(),
      ])
      setTransactions(transactionsData)
      setDashboard(dashboardData)
    } catch {
      message.error('Não foi possível carregar os dados da API.')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadData])

  function openCreateModal() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'Expense',
      date: dayjs(),
      paymentMethod: 'Pix',
    } as Partial<FormValues>)
    setModalOpen(true)
  }

  function openEditModal(item: Transaction) {
    setEditing(item)
    form.setFieldsValue({
      description: item.description,
      category: item.category,
      amount: item.amount,
      date: dayjs(item.date),
      type: item.type,
      paymentMethod: item.paymentMethod,
      notes: item.notes,
    })
    setModalOpen(true)
  }

  async function handleSubmit(values: FormValues) {
    const payload: TransactionPayload = {
      ...values,
      amount: Number(values.amount),
      date: values.date.format('YYYY-MM-DD'),
    }

    setSaving(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
        message.success('Lançamento atualizado.')
      } else {
        await createTransaction(payload)
        message.success('Lançamento cadastrado.')
      }
      setModalOpen(false)
      await loadData()
    } catch {
      message.error('Não foi possível salvar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTransaction(id)
      message.success('Lançamento removido.')
      await loadData()
    } catch {
      message.error('Não foi possível remover o lançamento.')
    }
  }

  function exportCsv() {
    const header = ['data', 'tipo', 'descrição', 'categoria', 'valor', 'forma_pagamento', 'observações']
    const lines = transactions.map((item) =>
      [
        item.date,
        item.type === 'Income' ? 'Entrada' : 'Despesa',
        item.description,
        item.category,
        item.amount,
        item.paymentMethod,
        item.notes ?? '',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'controle-gastos.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function resetDashboardLayout() {
    setDraftDashboardLayout(defaultDashboardLayout)
    if (!isLayoutEditing) {
      setDashboardLayout(defaultDashboardLayout)
      saveDashboardLayout(defaultDashboardLayout)
    }
    message.success('Layout restaurado.')
  }

  function startLayoutEditing() {
    setDraftDashboardLayout(dashboardLayout)
    setIsLayoutEditing(true)
  }

  function cancelLayoutEditing() {
    setDraftDashboardLayout(dashboardLayout)
    setIsLayoutEditing(false)
    handleDragEnd()
  }

  function saveLayoutEditing() {
    setDashboardLayout(draftDashboardLayout)
    saveDashboardLayout(draftDashboardLayout)
    setIsLayoutEditing(false)
    handleDragEnd()
    message.success('Layout salvo.')
  }

  function moveDashboardCard(targetCard: DashboardCardId) {
    if (!isLayoutEditing || !draggedCard || draggedCard === targetCard) {
      return
    }

    setDraftDashboardLayout((currentLayout) => {
      const sourceIndex = currentLayout.indexOf(draggedCard)
      const targetIndex = currentLayout.indexOf(targetCard)
      if (sourceIndex < 0 || targetIndex < 0) {
        return currentLayout
      }

      const nextLayout = [...currentLayout]
      const [movedCard] = nextLayout.splice(sourceIndex, 1)
      nextLayout.splice(targetIndex, 0, movedCard)
      return nextLayout
    })
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, cardId: DashboardCardId) {
    if (!isLayoutEditing) {
      event.preventDefault()
      return
    }

    setDraggedCard(cardId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }

  function handleDragEnd() {
    setDraggedCard(null)
    setDragOverCard(null)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, cardId: DashboardCardId) {
    if (!isLayoutEditing) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverCard(cardId)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, cardId: DashboardCardId) {
    if (!isLayoutEditing) {
      return
    }

    event.preventDefault()
    moveDashboardCard(cardId)
    handleDragEnd()
  }

  const monthlyChartData = useMemo(
    () =>
      dashboard?.monthly.map((item) => ({
        month: monthLabel(item.month),
        entradas: item.income,
        despesas: item.expenses,
      })) ?? [],
    [dashboard],
  )

  const balanceChartData = useMemo(
    () =>
      dashboard?.monthly.map((item) => ({
        month: monthLabel(item.month),
        saldo: item.balance,
      })) ?? [],
    [dashboard],
  )

  const categoryChartData = dashboard?.byCategory ?? []
  const hasMonthlyData = monthlyChartData.length > 0
  const hasCategoryData = categoryChartData.length > 0
  const hasBalanceData = balanceChartData.length > 0

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Data',
      dataIndex: 'date',
      width: 110,
      sorter: (a, b) => a.date.localeCompare(b.date),
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
    },
    {
      title: 'Descrição',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Categoria',
      dataIndex: 'category',
      width: 140,
      filters: categories.map((category) => ({ text: category, value: category })),
      onFilter: (value, record) => record.category === value,
      render: (value: string) => <Tag className="category-tag">{value}</Tag>,
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      width: 110,
      filters: [
        { text: 'Entrada', value: 'Income' },
        { text: 'Despesa', value: 'Expense' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (value: TransactionType) => (
        <Tag className={value === 'Income' ? 'type-tag income' : 'type-tag expense'}>
          {value === 'Income' ? 'Entrada' : 'Despesa'}
        </Tag>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number, record) => (
        <span className={record.type === 'Income' ? 'amount-income' : 'amount-expense'}>
          {currency.format(value)}
        </span>
      ),
    },
    {
      title: 'Pagamento',
      dataIndex: 'paymentMethod',
      width: 150,
    },
    {
      title: '',
      width: 96,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Remover lançamento?"
            okText="Remover"
            cancelText="Cancelar"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  function getDashboardCards(): Record<DashboardCardId, DashboardCard> {
    return {
      overview: {
        title: 'Visão geral',
        content: (
          <section className="overview">
            <div>
              <Text className="eyebrow">Visão geral</Text>
              <Title level={2}>Seu mês financeiro em tempo real</Title>
              <Text className="overview-copy">
                {transactions.length > 0
                  ? `${transactions.length} lançamentos registrados até agora.`
                  : 'Comece registrando uma entrada ou despesa.'}
              </Text>
            </div>
            <div className="overview-balance">
              <span>Saldo atual</span>
              <strong className={(dashboard?.balance ?? 0) >= 0 ? 'positive' : 'negative'}>
                {currency.format(dashboard?.balance ?? 0)}
              </strong>
            </div>
          </section>
        ),
      },
      income: {
        title: 'Entradas',
        content: (
          <Card className="panel metric-card income-card">
            <div className="metric-icon">
              <DollarOutlined />
            </div>
            <Statistic
              title="Entradas"
              value={dashboard?.income ?? 0}
              precision={2}
              formatter={(value) => currency.format(Number(value))}
              valueStyle={{ color: '#16835d' }}
            />
          </Card>
        ),
      },
      expenses: {
        title: 'Despesas',
        content: (
          <Card className="panel metric-card expense-card">
            <div className="metric-icon">
              <BankOutlined />
            </div>
            <Statistic
              title="Despesas"
              value={dashboard?.expenses ?? 0}
              precision={2}
              formatter={(value) => currency.format(Number(value))}
              valueStyle={{ color: '#c24141' }}
            />
          </Card>
        ),
      },
      balance: {
        title: 'Saldo',
        content: (
          <Card className="panel metric-card balance-card">
            <div className="metric-icon">
              <WalletOutlined />
            </div>
            <Statistic
              title="Saldo"
              value={dashboard?.balance ?? 0}
              precision={2}
              formatter={(value) => currency.format(Number(value))}
              valueStyle={{ color: (dashboard?.balance ?? 0) >= 0 ? '#176b87' : '#c24141' }}
            />
          </Card>
        ),
      },
      savingsRate: {
        title: 'Taxa de economia',
        content: (
          <Card className="panel metric-card rate-card">
            <div className="metric-icon">
              <RiseOutlined />
            </div>
            <Statistic
              title="Taxa de economia"
              value={dashboard?.savingsRate ?? 0}
              suffix="%"
              precision={1}
            />
          </Card>
        ),
      },
      insights: {
        title: 'Tendências',
        content: (
          <section className="insight-grid">
            {dashboard?.insights.length ? (
              dashboard.insights.map((insight) => (
                <Alert
                  key={insight.title}
                  className="insight-card"
                  message={insight.title}
                  description={insight.description}
                  type={insight.severity === 'danger' ? 'error' : insight.severity}
                  showIcon
                />
              ))
            ) : (
              <Alert
                className="insight-card wide"
                message="Sem tendências ainda"
                description="As análises aparecem quando houver lançamentos suficientes."
                type="info"
                showIcon
              />
            )}
          </section>
        ),
      },
      monthlyChart: {
        title: 'Entradas x despesas mensais',
        content: (
          <Card className="panel" title="Entradas x despesas mensais">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => currency.format(Number(value))}
                    width={92}
                  />
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                  <Legend />
                  <Bar dataKey="entradas" fill="#16835d" radius={[7, 7, 0, 0]} />
                  <Bar dataKey="despesas" fill="#c24141" radius={[7, 7, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="Nenhum dado mensal para exibir." />
            )}
          </Card>
        ),
      },
      categoryChart: {
        title: 'Despesas por categoria',
        content: (
          <Card className="panel" title="Despesas por categoria">
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={102}
                    paddingAngle={3}
                    label={(entry) => entry.category}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="Cadastre despesas para ver categorias." />
            )}
          </Card>
        ),
      },
      balanceTrend: {
        title: 'Tendência de saldo',
        content: (
          <Card className="panel" title="Tendência de saldo" extra={<BarChartOutlined />}>
            {hasBalanceData ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={balanceChartData}>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => currency.format(Number(value))}
                    width={92}
                  />
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                  <Line dataKey="saldo" stroke="#176b87" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="A tendência aparece depois dos primeiros lançamentos." />
            )}
          </Card>
        ),
      },
      transactions: {
        title: 'Lançamentos',
        content: (
          <Card className="panel transaction-table" title="Lançamentos">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={transactions}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Nenhum lançamento cadastrado."
                  >
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                      Novo lançamento
                    </Button>
                  </Empty>
                ),
              }}
              scroll={{ x: 920 }}
              pagination={{ pageSize: 8, showSizeChanger: true }}
            />
          </Card>
        ),
      },
    }
  }

  function renderDashboardCard(cardId: DashboardCardId) {
    const card = getDashboardCards()[cardId]

    return (
      <div
        key={cardId}
        className={[
          'dashboard-item',
          cardSpans[cardId],
          isLayoutEditing ? 'is-editing' : '',
          draggedCard === cardId ? 'is-dragging' : '',
          dragOverCard === cardId && draggedCard !== cardId ? 'is-drop-target' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => handleDragOver(event, cardId)}
        onDrop={(event) => handleDrop(event, cardId)}
      >
        {isLayoutEditing ? (
          <div
            className="drag-handle"
            aria-label={`Mover ${card.title}`}
            title={`Mover ${card.title}`}
            draggable
            onDragStart={(event) => handleDragStart(event, cardId)}
          >
            <HolderOutlined />
            <span>{card.title}</span>
          </div>
        ) : null}
        {card.content}
      </div>
    )
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-row">
          <div className="brand">
            <div className="brand-mark">
              <WalletOutlined />
            </div>
            <div>
              <Title level={1}>Controle de Gastos Pessoal</Title>
              <Text>Dashboard financeiro pessoal</Text>
            </div>
          </div>
          <div className="header-actions">
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Atualizar
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              CSV
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Novo lançamento
            </Button>
          </div>
        </div>
      </Header>

      <Content className="content">
        <div className="dashboard-toolbar">
          <Text>
            {isLayoutEditing
              ? 'Modo de edição ativo. Arraste os cards e salve quando terminar.'
              : 'Layout bloqueado. Clique em editar para reorganizar os cards.'}
          </Text>
          <div className="layout-actions">
            {isLayoutEditing ? (
              <>
                <Button className="layout-action secondary" onClick={resetDashboardLayout}>
                  Restaurar padrão
                </Button>
                <Button
                  className="layout-action ghost"
                  icon={<CloseOutlined />}
                  onClick={cancelLayoutEditing}
                >
                  Cancelar
                </Button>
                <Button
                  className="layout-action primary"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={saveLayoutEditing}
                >
                  Salvar layout
                </Button>
              </>
            ) : (
              <Button
                className="layout-action primary"
                type="primary"
                icon={<EditOutlined />}
                onClick={startLayoutEditing}
              >
                Editar layout
              </Button>
            )}
          </div>
        </div>

        <section className="dashboard-grid">
          {(isLayoutEditing ? draftDashboardLayout : dashboardLayout).map((cardId) =>
            renderDashboardCard(cardId),
          )}
        </section>
      </Content>

      <Modal
        title={editing ? 'Editar lançamento' : 'Novo lançamento'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="transaction-form" onFinish={handleSubmit}>
          <Form.Item
            className="full"
            label="Descrição"
            name="description"
            rules={[{ required: true, message: 'Informe a descrição.' }]}
          >
            <Input placeholder="Ex.: mercado, salário, aluguel" />
          </Form.Item>

          <Form.Item
            label="Tipo"
            name="type"
            rules={[{ required: true, message: 'Informe o tipo.' }]}
          >
            <Select options={typeOptions} />
          </Form.Item>

          <Form.Item
            label="Valor"
            name="amount"
            rules={[{ required: true, message: 'Informe o valor.' }]}
          >
            <InputNumber min={0.01} precision={2} decimalSeparator="," style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Data"
            name="date"
            rules={[{ required: true, message: 'Informe a data.' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Categoria"
            name="category"
            rules={[{ required: true, message: 'Informe a categoria.' }]}
          >
            <Select showSearch options={categories.map((value) => ({ label: value, value }))} />
          </Form.Item>

          <Form.Item
            className="full"
            label="Forma de pagamento"
            name="paymentMethod"
            rules={[{ required: true, message: 'Informe a forma de pagamento.' }]}
          >
            <Select
              showSearch
              options={paymentMethods.map((value) => ({ label: value, value }))}
            />
          </Form.Item>

          <Form.Item className="full" label="Observações" name="notes">
            <Input.TextArea rows={3} placeholder="Opcional" />
          </Form.Item>

          <Form.Item className="full" style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                Salvar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default App
