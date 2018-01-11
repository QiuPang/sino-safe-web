/* eslint-disable no-param-reassign,no-plusplus,no-const-assign,max-len,prefer-const,no-unused-expressions */
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Row, Col, Card, Form, Input, Select, Icon, Button, Dropdown, Menu, Badge, Modal, Divider } from 'antd';
import moment from 'moment';

import ExamTable from '../../components/ExamTable';
import AddOrUpdateModal from '../../components/AddOrUpdateModal';
import DetailModal from '../../components/DetailMadal';
import styles from './Common.less';
import request from '../../utils/request';
import { convertUrl } from '../../utils/utils';

const FormItem = Form.Item;
// es6对象的解构赋值
const { Option } = Select;
const { confirm } = Modal;
const getValue = obj => Object.keys(obj).map(key => obj[key]).join(',');

@connect(state => ({
  examPlan: state.examPlan,
}))
@Form.create()
export default class examPlanData extends PureComponent {
  state = {
    addModalVisible: false,
    detailModalVisible: false,
    selectedRows: [],
    queryFormValues: {},
    updateData: {},
    detailData: {},
    addOrUpdate: '',
    key: '',
  };

  componentDidMount() {
    const { dispatch, form } = this.props;
    // 单位下拉菜单数据
    dispatch({
      type: 'examPlan/unit',
      payload: { suUnitName: '' },
    });
    // 考试名称下拉菜单数据
    dispatch({
      type: 'examPlan/examName',
      payload: { deExamName: '' },
    });
    // 查询数据
    form.validateFields((err, fieldsValue) => {
      if (err) return;
      const values = {
        ...fieldsValue,
      };
      this.setState({
        queryFormValues: values,
      });
      dispatch({
        type: 'examPlan/fetch',
        payload: values,
      });
    });
  }
  /**
   * 最后传递给table组件作为他的onchange属性
   * onChange 分页、排序、筛选变化时触发
   * Function(pagination, filters, sorter)
   * @param pagination
   * @param filtersArg
   * @param sorter
   */
  handleStandardTableChange = (pagination, filtersArg, sorter) => {
    const { dispatch } = this.props;
    const { searchFormValues } = this.state;

    const filters = Object.keys(filtersArg).reduce((obj, key) => {
      const newObj = { ...obj };
      newObj[key] = getValue(filtersArg[key]);
      return newObj;
    }, {});

    const params = {
      current: pagination.current,
      pageSize: pagination.pageSize,
      ...searchFormValues,
      ...filters,
    };
    if (sorter.field) {
      params.sorter = `${sorter.field}_${sorter.order}`;
    }

    dispatch({
      type: 'examPlan/fetch',
      payload: params,
    });
  }
  // 表单重置
  handleFormReset = () => {
    const { form } = this.props;
    form.resetFields();
  }
  // 列表批量操作
  handleBatchClick = (e) => {
    const { dispatch } = this.props;
    const { selectedRows } = this.state;

    if (!selectedRows) return;

    switch (e.key) {
      case 'remove':
        dispatch({
          type: 'examPlan/remove',
          payload: {
            no: selectedRows.map(row => row.no).join(','),
          },
          callback: () => {
            this.setState({
              selectedRows: [],
            });
          },
        });
        break;
      default:
        break;
    }
  }
  // 用于传递给子组件
  handleSelectRows = (rows) => {
    this.setState({
      selectedRows: rows,
    });
  }
  // 查询form表单提交
  handleSubmitQueryForm = (e) => {
    e.preventDefault();
    const { dispatch, form } = this.props;
    /**
     * validateFields 校验并获取一组输入域的值与 Error，若 fieldNames 参数为空，则校验全部组件
     * Function([fieldNames: string[]], options: object, callback: Function(errors, values))
     */
    form.validateFields((err, fieldsValue) => {
      if (err) return;
      const values = {
        ...fieldsValue,
      };
      this.setState({
        queryFormValues: values,
      });
      dispatch({
        type: 'examPlan/fetch',
        payload: values,
      });
    });
  }
  // addModal隐藏显示
  handleAddModalVisible = (flag) => {
    this.setState({
      addModalVisible: !!flag,
    });
  };
  // 点击新建
  handleAddClick = () => {
    this.setState({
      addOrUpdate: 'add',
      addModalVisible: true,
    });
  }
  // addModal隐藏显示
  handleDetailModalVisible = (flag) => {
    this.setState({
      detailModalVisible: !!flag,
    });
  };
  // 列表单项操作
  handleSingleDoneClick = (key, flag) => {
    let { dispatch, examPlan: { data } } = this.props;
    let singleData = data.list.filter(item => item.depId === key)[0];
    switch (flag) {
      // 详情
      case 'detail':
        this.setState({
          detailData: singleData,
          detailModalVisible: true,
        });
        break;
      // 修改
      case 'update':
        this.setState({
          addOrUpdate: 'update',
          updateData: singleData,
          addModalVisible: true,
          key,
        });
        break;
      // 删除
      case 'remove':
        confirm({
          title: '确定删除此次考试吗?',
          content: '',
          okText: '确定',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => {
            const callback = () => {
              this.handleAddModalVisible(false);
              dispatch({
                type: 'examPlan/fetch',
                payload: { ...this.state.queryFormValues },
              });
            };
            dispatch({
              type: 'examPlan/remove',
              payload: { depId: key },
              callback,
            });
          },
          onCancel() {
          },
        });
        break;
      default:
        break;
    }
  }
  // addForm考试名字重复校验
  handleExamPlanNameChange = (rule, value, callback) => {
    const { key } = this.state;
    const values = {
      method: 'POST',
      body: { depId: key, depExamPlanName: value },
    };
    const url = convertUrl('/data/examPlanNameVerify');
    const response = request(url, values);
    console.log('考试计划名重复验证传值:', values);
    response.then((data) => {
      if (data) {
        console.log('考试计划名重复验证返回值:', data);
        data.status === '1' ? callback() : callback('考试计划名称重复！');
      }
    });
  }
  // addForm提交
  handleSubmitAddForm = (form, addOrUpdate) => {
    const { dispatch } = this.props;
    const { key, queryFormValues } = this.state;
    // validateFields 校验并获取一组输入域的值与 Error，若 fieldNames 参数为空，则校验全部组件
    form.validateFields((err, fieldsValue) => {
      if (err) return;
      const values = {
        ...fieldsValue,
        depGmtStart: fieldsValue.depGmtStart.format('YY/MM/DD hh:mm:ss'),
        depGmtEnd: fieldsValue.depGmtEnd.format('YY/MM/DD hh:mm:ss'),
      };
      const callback = () => {
        this.handleAddModalVisible(false);
        dispatch({
          type: 'examPlan/fetch',
          payload: { ...queryFormValues },
        });
      };
      if (addOrUpdate === 'add') {
        dispatch({
          type: 'examPlan/add',
          payload: values,
          callback,
        });
      } else if (addOrUpdate === 'update') {
        dispatch({
          type: 'examPlan/update',
          payload: {
            ...values,
            depId: key,
          },
          callback,
        });
      }
    });
  }
  // select
  // handleSelectChange = (value) => {
  //   const { dispatch } = this.props;
  //   console.log(111);
  //   dispatch({
  //     type: 'examPlan/unit',
  //     payload: { suUnitName: value },
  //   });
  // }
  // 渲染简单查询
  renderSimpleQueryForm() {
    const { examPlan: { unitData, examNameData } } = this.props;
    const unitOptions = [];
    const examNameOptions = [];
    if (unitData) {
      unitData.dataMain.list.map(item =>
        unitOptions.push(<Option key={item.key} value={item.key}>{item.val}</Option>)
      );
    }
    if (examNameData) {
      examNameData.dataMain.list.map(item =>
        examNameOptions.push(<Option key={item.key} value={item.key}>{item.val}</Option>)
      );
    }

    const { getFieldDecorator } = this.props.form;
    return (
      <Form onSubmit={this.handleSubmitQueryForm} layout="inline">
        <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
          <Col md={8} sm={24}>
            <FormItem label="考试名称">
              {getFieldDecorator('depExamid')(
                <Select
                  style={{ width: '100%' }}
                  placeholder="--请选择--"
                >
                  {examNameOptions}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="考试计划名称">
              {getFieldDecorator('depPlanName')(
                <Input placeholder="请输入" />
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24}>
            <FormItem label="单位名称">
              {getFieldDecorator('depUnitId')(
                <Select
                  style={{ width: '100%' }}
                  placeholder="--请选择--"
                >
                  {unitOptions}
                </Select>
              )}
            </FormItem>
          </Col>

          <Col md={8} sm={24}>
            <FormItem label="状态">
              {getFieldDecorator('depDeleted', { initialValue: 'false' })(
                <Select placeholder="请选择" style={{ width: '100%' }}>
                  <Option value="true">已删除</Option>
                  <Option value="false">活动的</Option>
                </Select>
              )}
            </FormItem>
          </Col>
          <Col md={8} sm={24} style={{ float: 'right', marginBottom: 24, marginRight: -84 }}>
            <span className={styles.submitButtons}>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button style={{ marginLeft: 8 }} onClick={this.handleFormReset}>重置</Button>
            </span>
          </Col>
        </Row>
      </Form>
    );
  }

  render() {
    const { examPlan: { loading: examPlanLoading, data, unitData } } = this.props;
    const { selectedRows, addModalVisible, detailModalVisible, updateData, detailData, addOrUpdate, key } = this.state;
    // examPlan的columns
    const depPlanStateMap = ['default', 'processing', 'error'];
    const depPlanState = ['初始', '启用', '停用'];
    const statusMap = ['success', 'error'];
    const status = ['活动的', '已删除'];
    const columns = [
      {
        title: '考试名称',
        dataIndex: 'depExamName',
      },
      {
        title: '考试计划名称',
        dataIndex: 'depPlanName',
      },
      {
        title: '考试计划年度',
        dataIndex: 'depExamYear',
        sorter: true,
      },
      {
        title: '考试开始时间',
        dataIndex: 'depGmtStart',
        sorter: true,
        render: val => <span>{moment(val).format('YYYY-MM-DD HH:mm')}</span>,
      },
      {
        title: '考试结束时间',
        dataIndex: 'depGmtEnd',
        sorter: true,
        render: val => <span>{moment(val).format('YYYY-MM-DD HH:mm')}</span>,
      },
      {
        title: '单位名称',
        dataIndex: 'depUnitName',
      },
      {
        title: '状态',
        dataIndex: 'depPlanState',
        render(val) {
          return (<Badge
            status={
              depPlanStateMap[parseInt(val, 0)]}
            text={depPlanState[parseInt(val, 0)]}
          />);
        },
      },
      {
        title: '是否删除',
        dataIndex: 'deDeleted',
        render(val) {
          return (<Badge
            status={
              val ? statusMap[1] : statusMap[0]}
            text={val ? status[1] : status[0]
            }
          />);
        },
      },
      {
        title: '操作',
        render: (val, record) => (
          <div>
            <a onClick={() => this.handleSingleDoneClick(record.depId, 'detail')}>{record.depDeleted ? '' : '详情'}</a>
            <Divider type="vertical" />
            <a onClick={() => this.handleSingleDoneClick(record.depId, 'update')}>{record.depDeleted ? '' : '修改'}</a>
            <Divider type="vertical" />
            <a onClick={() => this.handleSingleDoneClick(record.depId, 'remove')}>{record.depDeleted ? '' : '删除'}</a>
          </div>
        ),
      },
    ];
    const addColumns = [
      {
        title: '考试名称',
        dataIndex: 'depExamName',
        type: 'select',
        required: true,
      },
      {
        title: '考试计划名称',
        dataIndex: 'depPlanName',
        type: 'input',
        validator: this.handleExamPlanNameChange,
        required: true,
      },
      {
        title: '计划年度',
        dataIndex: 'depExamYear',
        type: 'input',
        required: true,
      },
      {
        title: '考试开始时间',
        dataIndex: 'depGmtStart',
        type: 'date',
        required: true,
      },
      {
        title: '考试结束时间',
        dataIndex: 'depGmtEnd',
        type: 'date',
        required: true,
      },
      {
        title: '单位名称',
        dataIndex: 'depUnitName',
        type: 'input',
        required: true,
      },
      {
        title: '考试计划备注',
        dataIndex: 'depPlanRemark',
        type: 'input',
        required: true,
      },
    ];
    const detailColumns = [
      {
        title: '考试名称',
        dataIndex: 'depExamName',
      },
      {
        title: '考试计划名称',
        dataIndex: 'depPlanName',
      },
      {
        title: '考试计划年度',
        dataIndex: 'depExamYear',
      },
      {
        title: '考试开始时间',
        dataIndex: 'depGmtStart',
      },
      {
        title: '考试结束时间',
        dataIndex: 'depGmtEnd',
      },
      {
        title: '单位名称',
        dataIndex: 'depUnitName',
      },
      {
        title: '计划备注',
        dataIndex: 'depPlanRemark',
      },
      {
        title: '状态',
        dataIndex: 'depPlanState',
      },
      {
        title: '创建时间',
        dataIndex: 'depGmtCreate',
      },
      {
        title: '更新时间',
        dataIndex: 'depGmtModified',
      },
    ];
    const menu = (
      <Menu onClick={this.handleBatchClick} selectedKeys={[]} />
    );
    return (
      <div>
        <Card bordered={false}>
          <div className={styles.tableList}>
            <div className={styles.tableListForm}>
              {this.renderSimpleQueryForm(unitData)}
            </div>
            <div className={styles.tableListOperator}>
              <Button icon="plus" type="primary" onClick={this.handleAddClick}>
                新建
              </Button>
              {
                selectedRows.length > 0 && (
                  <span>
                    <Dropdown overlay={menu}>
                      <Button>
                        更多操作 <Icon type="down" />
                      </Button>
                    </Dropdown>
                  </span>
                )
              }
            </div>
            <ExamTable
              selectedRows={selectedRows}
              loading={examPlanLoading}
              data={data}
              columns={columns}
              onSelectRow={this.handleSelectRows}
              onChange={this.handleStandardTableChange}
            />
          </div>
        </Card>
        <AddOrUpdateModal
          addColumns={addColumns}
          addModalVisible={addModalVisible}
          handleSubmitAddForm={this.handleSubmitAddForm}
          handleAddModalVisible={this.handleAddModalVisible}
          updateData={updateData}
          addOrUpdate={addOrUpdate}
          key={key}
        />
        <DetailModal
          detailColumns={detailColumns}
          detailData={detailData}
          detailModalVisible={detailModalVisible}
          handleDetailModalVisible={this.handleDetailModalVisible}
        />
      </div>
    );
  }
}
