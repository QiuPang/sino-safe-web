import React, { PureComponent } from 'react';
import { Layout, Menu, Icon, Spin, Tag, Dropdown, Avatar, message } from 'antd';
import moment from 'moment';
import groupBy from 'lodash/groupBy';
import Debounce from 'lodash-decorators/debounce';
import NoticeIcon from '../../components/NoticeIcon';
import HeaderSearch from '../../components/HeaderSearch';
import styles from './index.less';

const { Header } = Layout;

export default class GlobalHeader extends PureComponent {
  componentDidMount() {
    this.props.dispatch({
      type: 'user/fetchCurrent',
    });
  }
  componentWillUnmount() {
    this.triggerResizeEvent.cancel();
  }
  getNoticeData() {
    const { notices = [] } = this.props;
    if (notices.length === 0) {
      return {};
    }
    const newNotices = notices.map((notice) => {
      const newNotice = { ...notice };
      if (newNotice.datetime) {
        newNotice.datetime = moment(notice.datetime).fromNow();
      }
      // transform id to item key
      if (newNotice.id) {
        newNotice.key = newNotice.id;
      }
      if (newNotice.extra && newNotice.status) {
        const color = ({
          todo: '',
          processing: 'blue',
          urgent: 'red',
          doing: 'gold',
        })[newNotice.status];
        newNotice.extra = <Tag color={color} style={{ marginRight: 0 }}>{newNotice.extra}</Tag>;
      }
      return newNotice;
    });
    return groupBy(newNotices, 'type');
  }
    handleNoticeClear = (type) => {
      message.success(`清空了${type}`);
      this.props.dispatch({
        type: 'global/clearNotices',
        payload: type,
      });
    }
    handleNoticeVisibleChange = (visible) => {
      if (visible) {
        this.props.dispatch({
          type: 'global/fetchNotices',
        });
      }
    }
    handleMenuClick = ({ key }) => {
      if (key === 'logout') {
        this.props.dispatch({
          type: 'login/logout',
        });
      }
    }
    toggle = () => {
      const { collapsed } = this.props;
      this.props.dispatch({
        type: 'global/changeLayoutCollapsed',
        payload: !collapsed,
      });
      this.triggerResizeEvent();
    }
    @Debounce(600)
    triggerResizeEvent() { // eslint-disable-line
      const event = document.createEvent('HTMLEvents');
      event.initEvent('resize', true, false);
      window.dispatchEvent(event);
    }
    render() {
      const {
        currentUser, collapsed, fetchingNotices,
      } = this.props;
      const menu = (
        <Menu className={styles.menu} selectedKeys={[]} onClick={this.handleMenuClick}>
          <Menu.Item disabled><Icon type="user" />个人中心</Menu.Item>
          <Menu.Item disabled><Icon type="setting" />设置</Menu.Item>
          <Menu.Divider />
          <Menu.Item key="logout"><Icon type="logout" />退出登录</Menu.Item>
        </Menu>
      );
      const noticeData = this.getNoticeData();
      return (
        <Header className={styles.header}>
          <Icon
            className={styles.trigger}
            type={collapsed ? 'menu-unfold' : 'menu-fold'}
            onClick={this.toggle}
          />
        </Header>
      );
    }
}
