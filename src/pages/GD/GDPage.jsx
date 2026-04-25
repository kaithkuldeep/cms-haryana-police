import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Descriptions,
  Table, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Space, 
  Card, 
  Tag, 
  Modal, 
  Radio,
  Form, 
  message, 
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
  Timeline,
  Divider,
  Empty,
  Collapse,
  Pagination
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  AlertOutlined,
  HistoryOutlined,
  AudioOutlined,
  DeleteOutlined,
  FilterOutlined,
  PrinterOutlined, 
  CloseOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
  PhoneOutlined,
  EditOutlined,
  ContactsOutlined,
  FolderOpenOutlined,
  FolderFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../hooks/useAuth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Draggable from 'react-draggable';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const GD_TYPES = [
  'Absent',
  'Accidental death',
  'Accidents/Incidents',
  'Accused in Police Custody',
  'Accused Sent to Judicial Custody',
  'Accused Sent to Transit Remand',
  'Arrest in Preventive Action',
  'Arrest/Re-Arrest/Surrender',
  'Arrested accused re-admitted in lock up after investigation',
  'Arrested accused taken out of lock up for investigation',
  'Arrival',
  'Arrival/Return',
  'Assigning Officer Incharge',
  'Attending court for evidence',
  'Bail',
  'Bandi Muljim into PS Lock Up',
  'Bandobast',
  'Beats/Patrol Duty',
  'Bomb blast',
  'Burn cases',
  'Case Diary',
  'Cash book entry',
  'Change of DO',
  'Change of Guard',
  'Change of HCM',
  'Change of Malkhana Muhararar',
  'Change of Report Writer',
  'Change of Santri',
  'Checking of History-Sheeters & Known Criminals',
  'Citizen Information/Tip Received',
  'Close of GD',
  'Combing operations',
  'Complaint received',
  'Confidential Reports',
  'Control Room Information/PCR Call',
  'Criminal case',
  'Current/future political, social, religious etc. activities',
  'Dead Animal',
  'Defaults of police personnel',
  'Departure',
  'Departure (staff/visitor)',
  'Detention of Juvenile offender',
  'Duty Start',
  'Duty End',
  'ERSS ERV',
  'Execution of summon/warrant',
  'File transfer',
  'FIR Transfer',
  'Fire Incident',
  'Firing',
  'Flag Hoisting',
  'Good morning squad',
  'Handing over of Property/Charge',
  'Help provided to police staff of other police stations for investigation',
  'Information entry',
  'Information from control room',
  'Information from hospital',
  'Information of functions/ occasions',
  'Inspection note',
  'Interrogation/search/checking report',
  'Investigation Reports',
  'Juvenile Case',
  'Leave/Seek report',
  'Lockup Inspection',
  'Lost Property',
  'Malkhana Inspection',
  'Medical check-up of arrested accused',
  'Medical Rest',
  'Medico Legal Case',
  'Missing Cattle',
  'Missing person',
  'Muddemal sent for expert\'s opinion',
  'Nakabandi',
  'Night round',
  'Nikasi Muljim from PS Lock Up',
  'Nil report for last 2 hours',
  'Non-Cognizable Report',
  'Opening of GD',
  'Patrol / Movement',
  'Patrolling',
  'PCR Call',
  'Preventive Action',
  'Property Deposited in Malkhana',
  'Property Release from Malkhana',
  'Property Seizure',
  'Public relation activities',
  'Record of Arrested Accused in lockup',
  'Remand',
  'Roll Call',
  'RukkaGD',
  'Search report',
  'Sensitive guard checking',
  'Special entry',
  'Special incident',
  'Station Diary charge'
];

export default function GDPage() {
  const { token, profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entryType: '',
    startDate: '',
    endDate: '',
    officerId: '',
    search: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [stats, setStats] = useState({
    recentActivity: [],
    unusualActivity: [],
    staffMovement: []
  });
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [staffFilter, setStaffFilter] = useState('all'); // New filter state
  const [exportDateRange, setExportDateRange] = useState(null);
  const [entryMode, setEntryMode] = useState('single');
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [staffForm] = Form.useForm();
  const [addStaffForm] = Form.useForm();

  const [subjectCharCount, setSubjectCharCount] = useState(0);
  const [descCharCount, setDescCharCount] = useState(0);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return message.error("Your browser does not support Speech Recognition.");
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onspeechend = () => recognition.stop();
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentDesc = form.getFieldValue('description') || '';
      const newDesc = currentDesc ? `${currentDesc} ${transcript}` : transcript;
      form.setFieldsValue({ description: newDesc });
      setDescCharCount(newDesc.length);
    };
    
    recognition.onerror = (event) => {
      message.error("Error recognizing speech: " + event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Draggable Modal State
  const [disabled, setDisabled] = useState(true);
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const draggleRef = useRef(null);

  const onStart = (_event, uiData) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = draggleRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/gd/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStaffData(data);
    } catch (err) {
       console.error("Staff fetch error:", err);
    }
  };

  const updateStaffProfile = async (values) => {
    try {
      const res = await fetch('/api/gd/staff/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        message.success("Staff profile updated successfully");
        fetchStaff();
      }
    } catch (err) {
      message.error("Failed to update staff profile");
    }
  };

  const deleteStaffMember = async (id) => {
    try {
      const res = await fetch(`/api/gd/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        message.success("Staff member deleted (Transferred) successfully");
        fetchStaff();
      }
    } catch (err) {
      message.error("Failed to delete member");
    }
  };

  useEffect(() => {
    if (isStaffModalOpen) fetchStaff();
  }, [isStaffModalOpen]);

  const addStaffMember = async (values) => {
    try {
      const res = await fetch('/api/gd/add-member', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned an invalid response. Please check if the backend is running.");
      }

      const result = await res.json();
      
      if (res.ok) {
        message.success("New staff member added successfully");
        setIsAddStaffModalOpen(false);
        addStaffForm.resetFields();
        fetchStaff();
      } else {
        throw new Error(result.error || "Server error");
      }
    } catch (err) {
      console.error("Save Member Error:", err);
      message.error(`${err.message}`);
    }
  };

  const fetchGD = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        page,
        limit: 10
      });
      const res = await fetch(`/api/gd?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      setData(result.entries);
      setTotal(result.total);
    } catch (err) {
      message.error('Failed to fetch GD entries');
    } finally {
      setLoading(false);
    }
  }, [token, filters, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/gd/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      setStats(result);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  }, [token]);

  useEffect(() => {
    fetchGD();
    fetchStats();
  }, [fetchGD, fetchStats]);

  const handleSearch = (val) => {
    setFilters(prev => ({ ...prev, search: val }));
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const handleDateRangeChange = (dates) => {
    if (!dates) {
      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
    } else {
      setFilters(prev => ({ 
        ...prev, 
        startDate: dates[0].format('YYYY-MM-DD'), 
        endDate: dates[1].format('YYYY-MM-DD') 
      }));
    }
    setPage(1);
  };

  const handleAISuggestSubject = async () => {
    const desc = form.getFieldValue('description');
    if (!desc || desc.length < 20) return message.warning('Enter a longer description first for AI to analyze');
    
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/gd/suggest-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ description: desc })
      });
      const result = await res.json();
      if (result.subject) {
        form.setFieldsValue({ subject: result.subject });
        setSubjectCharCount(result.subject.length);
        message.success('Subject suggested by AI');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAIPolishDescription = async (fieldName) => {
    const fieldPath = fieldName ? ['entries', ...fieldName] : ['description'];
    const desc = form.getFieldValue(fieldPath);
    if (!desc || desc.length < 20) return message.warning('Enter description first');
    
    setIsPolishing(true);
    try {
      const res = await fetch('/api/gd/polish-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ description: desc })
      });
      const result = await res.json();
      if (result.polished) {
        if (fieldName) { 
          form.setFieldValue(['entries', fieldName[0], fieldName[1]], result.polished);
        } else { 
          form.setFieldsValue({ description: result.polished });
          setDescCharCount(result.polished.length);
        }
        message.success('Description polished by AI');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let payload;
      if (entryMode === 'multiple') {
        payload = values.entries.map(e => ({
          ...e,
          entry_type: e.entry_type === 'Others' ? e.custom_entry_type : e.entry_type,
          person_name: values.person_name,
          mobile_number: values.mobile_number
        }));
      } else {
        payload = {
           ...values,
           entry_type: values.entry_type === 'Others' ? values.custom_entry_type : values.entry_type,
           description: values.description // Map back if needed
        };
      }

      const res = await fetch('/api/gd', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        message.success(`${entryMode === 'multiple' ? 'Multiple entries' : 'GD Entry'} created successfully`);
        setIsModalOpen(false);
        form.resetFields();
        fetchGD();
        fetchStats();
      } else {
        const err = await res.json();
        message.error(err.error || 'Failed to create entry');
      }
    } catch (err) {
      message.error('Error connecting to server');
    }
  };

  const showDetails = (record) => {
    setSelectedEntry(record);
    setIsDetailModalOpen(true);
  };

  const fetchExportData = async (targetRange) => {
    try {
      const exportFilters = { ...filters };
      if (targetRange && targetRange.startDate && targetRange.endDate) {
         exportFilters.startDate = targetRange.startDate;
         exportFilters.endDate = targetRange.endDate;
      } else if (!exportFilters.startDate || !exportFilters.endDate) {
         exportFilters.startDate = dayjs().format('YYYY-MM-DD');
         exportFilters.endDate = dayjs().format('YYYY-MM-DD');
      }
      
      const queryParams = new URLSearchParams({
        ...exportFilters,
        page: 1,
        limit: 10000
      });
      const res = await fetch(`/api/gd?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      return { entries: result.entries, dateRange: exportFilters };
    } catch (err) {
      message.error("Failed to fetch export data");
      return { entries: [], dateRange: {} };
    }
  };

  const exportPDF = async () => {
    const { entries, dateRange } = await fetchExportData(exportDateRange);
    if (!entries || entries.length === 0) return message.warning('No entries found for export in the selected date range.');
    
    const doc = new jsPDF();
    doc.text('Haryana Police - Daily Station Diary (GD)', 14, 15);
    doc.setFontSize(10);
    const dateStr = dateRange.startDate === dateRange.endDate ? dateRange.startDate : `${dateRange.startDate} to ${dateRange.endDate}`;
    doc.text(`Generated for Date: ${dateStr}`, 14, 22);
    
    const tableColumn = ["GD No", "Date/Time", "Type", "Person", "Officer"];
    const tableRows = entries.map(item => [
      item.gd_number,
      dayjs(item.date_time).format('DD/MM/YY HH:mm'),
      item.entry_type,
      item.person_name || '—',
      item.officer_name
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
    });
    doc.save(`GD_Report_${dateStr}.pdf`);
    message.success('PDF Exported successfully');
  };

  const exportExcel = async () => {
    const { entries, dateRange } = await fetchExportData(exportDateRange);
    if (!entries || entries.length === 0) return message.warning('No entries found for export in the selected date range.');
    
    const dateStr = dateRange.startDate === dateRange.endDate ? dateRange.startDate : `${dateRange.startDate}_to_${dateRange.endDate}`;
    const worksheet = XLSX.utils.json_to_sheet(entries.map(item => ({
      'GD Number': item.gd_number,
      'Date Time': dayjs(item.date_time).format('YYYY-MM-DD HH:mm'),
      'Entry Type': item.entry_type,
      'Person Name': item.person_name,
      'Mobile': item.mobile_number,
      'Description': item.description,
      'Officer': item.officer_name,
      'Station': item.station_id
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GD_Entries");
    XLSX.writeFile(workbook, `GD_Report_${dateStr}.xlsx`);
    message.success('Excel Exported successfully');
  };

  const columns = [
    {
      title: 'GD No',
      dataIndex: 'gd_number',
      key: 'gd_number',
      render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: 'Date/Time',
      dataIndex: 'date_time',
      key: 'date_time',
      render: (text) => dayjs(text).format('DD MMM YYYY HH:mm')
    },
    {
      title: 'Type',
      dataIndex: 'entry_type',
      key: 'entry_type',
      render: (type) => {
        let color = 'blue';
        if (type.includes('Arrival')) color = 'green';
        if (type.includes('Departure')) color = 'orange';
        if (type.includes('Complaint')) color = 'red';
        if (type.includes('Incident')) color = 'volcano';
        return <Tag color={color}>{type}</Tag>;
      }
    },
    {
      title: 'Person',
      dataIndex: 'person_name',
      key: 'person_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text>{text || '—'}</Text>
          {record.mobile_number && <Text type="secondary" style={{ fontSize: '12px' }}>{record.mobile_number}</Text>}
        </Space>
      )
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      width: 150,
      render: (text) => text || '—'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 250
    },
    {
      title: 'Officer',
      dataIndex: 'officer_name',
      key: 'officer_name',
      render: (text) => (
        <Space>
          <UserOutlined />
          <Text>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => showDetails(record)} 
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        {/* Header Section */}
        <Col span={24}>
          <Card bordered={false} bodyStyle={{ padding: '16px 24px' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>Smart General Diary (GD)</Title>
                    <Text type="secondary">Digital Station Diary for Haryana Police</Text>
                  </div>
                  <div style={{ borderLeft: '1px solid #d9d9d9', height: '40px' }} />
                  <Button 
                    type="primary" 
                    icon={<TeamOutlined />} 
                    size="large" 
                    onClick={() => setIsStaffModalOpen(true)}
                    style={{ background: '#3f51b5', borderColor: '#3f51b5', borderRadius: '8px' }}
                  >
                    Staff Status Board
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PrinterOutlined />} 
                    size="large" 
                    onClick={() => setIsExportModalOpen(true)}
                    style={{ background: '#2e7d32', borderColor: '#2e7d32', borderRadius: '8px' }}
                  >
                    Generate Reports
                  </Button>
                </div>
              </Col>
              <Col>
                <Space size="middle">
                  <Button 
                    icon={<SearchOutlined />} 
                    size="large" 
                    onClick={() => setIsSearchModalOpen(true)}
                    style={{ borderColor: '#ef6c00', color: '#ef6c00', borderRadius: '8px', fontWeight: 'bold' }}
                  >
                    Advance Search
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="large"
                    onClick={() => {
                      setEntryMode('single');
                      setIsModalOpen(true);
                      form.resetFields();
                    }}
                  >
                    New GD Entry
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Stats Section */}
        <Col span={24}>
          <Row gutter={16}>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic 
                  title="Total Entries Today" 
                  value={data.filter(d => dayjs(d.date_time).isSame(dayjs(), 'day')).length} 
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<HistoryOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic 
                  title="Complaints Today" 
                  value={data.filter(d => d.entry_type === 'Complaint received' && dayjs(d.date_time).isSame(dayjs(), 'day')).length} 
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<AlertOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                bordered={false} 
                bodyStyle={{ padding: '8px 24px', height: '100px' }}
                style={{ background: 'linear-gradient(135deg, #1a2733 0%, #253447 100%)', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <Title level={5} style={{ margin: 0, color: '#1890ff', fontSize: '14px' }}>
                      <ThunderboltOutlined style={{ marginRight: '8px' }} /> Live Digital Duty Log
                   </Title>
                   <Badge status="processing" text={<span style={{ color: '#52c41a', fontSize: '10px' }}>LIVE STATION FEED</span>} />
                </div>
                <div style={{ maxHeight: '60px', overflowY: 'auto', paddingRight: '8px' }}>
                  {stats.recentActivity.length > 0 ? (
                    <Timeline 
                      pending={false}
                      reverse={false}
                      size="small"
                      items={stats.recentActivity.slice(0, 5).map((item, idx) => ({
                        color: item.entry_type.includes('Raid') ? 'red' : item.entry_type.includes('Departure') ? 'blue' : 'green',
                        children: (
                          <div 
                            style={{ cursor: 'pointer', fontSize: '12px', color: '#eee' }} 
                            onClick={() => showDetails(item)}
                          >
                            <Text strong style={{ color: '#1890ff' }}>{dayjs(item.date_time).format('HH:mm')}</Text>
                            <span style={{ margin: '0 8px', color: '#666' }}>|</span>
                            <Text style={{ color: '#fff' }}>{item.officer_name}: {item.entry_type}</Text>
                          </div>
                        ),
                        dot: item.entry_type.includes('Raid') ? <AlertOutlined style={{ fontSize: '12px' }} /> : <ClockCircleOutlined style={{ fontSize: '12px' }} />
                      }))}
                    />
                  ) : (
                    <Text type="secondary" style={{ fontSize: '12px' }}>No recent activity to show.</Text>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Main Content Section */}
        <Col span={24}>
          <Card bordered={false}>
            <div style={{ marginBottom: '20px' }}>
              <Space wrap size="middle">
                <Input
                  placeholder="Search GD No, Name, Mobile..."
                  prefix={<SearchOutlined />}
                  allowClear
                  onPressEnter={(e) => handleSearch(e.target.value)}
                  onChange={(e) => !e.target.value && handleSearch('')}
                  style={{ width: 300 }}
                />
                <Select
                  showSearch
                  placeholder="Entry Type"
                  style={{ width: 200 }}
                  allowClear
                  filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                  onChange={(v) => handleFilterChange('entryType', v)}
                >
                  <Select.Option value="" style={{ fontWeight: 'bold' }}>Total Diary (All)</Select.Option>
                  {[...GD_TYPES, 'Others'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                </Select>
                <RangePicker 
                  onChange={handleDateRangeChange}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={fetchGD}>Apply Filters</Button>
              </Space>
            </div>

            {(() => {
              const groupedData = data.reduce((acc, item) => {
                const dateStr = dayjs(item.date_time).format('DD MMM YYYY');
                let group = acc.find(g => g.date === dateStr);
                if (!group) {
                  group = { date: dateStr, items: [] };
                  acc.push(group);
                }
                group.items.push(item);
                return acc;
              }, []);

              return groupedData.length > 0 ? (
                <>
                  <Collapse 
                    defaultActiveKey={[groupedData[0]?.date]}
                    size="large"
                    style={{ background: 'transparent', border: 'none' }}
                  >
                    {groupedData.map((group) => (
                      <Collapse.Panel 
                        header={
                          <Space>
                             <CalendarOutlined style={{ color: '#1890ff' }} />
                             <Text strong style={{ fontSize: '16px' }}>{group.date}</Text>
                             <Tag color="blue" bordered={false} style={{ borderRadius: '12px' }}>{group.items.length} Entries</Tag>
                          </Space>
                        } 
                        key={group.date}
                        style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}
                      >
                        <Table 
                          columns={columns} 
                          dataSource={group.items} 
                          rowKey="id"
                          pagination={false}
                          size="middle"
                        />
                      </Collapse.Panel>
                    ))}
                  </Collapse>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Pagination
                      total={total}
                      current={page}
                      pageSize={10}
                      onChange={(p) => setPage(p)}
                      showTotal={(total) => `Total ${total} entries`}
                      showSizeChanger={false}
                    />
                  </div>
                </>
              ) : (
                  <Empty description="No General Diary Entries Found" style={{ margin: '40px 0' }} />
              );
            })()}
          </Card>
        </Col>
      </Row>

      {/* New GD Entry Modal (Enhanced CCTNS Style) */}
      <Modal
        title={
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '40px', cursor: 'move' }}
            onMouseOver={() => { if (disabled) setDisabled(false); }}
            onMouseOut={() => setDisabled(true)}
          >
            <span>Add General Diary Details</span>
            <Tag color="red">*Mandatory Fields</Tag>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>Close</Button>,
          <Button key="clear" onClick={() => form.resetFields()}>Clear</Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>Submit</Button>
        ]}
        width={entryMode === 'multiple' ? 1000 : 800}
        destroyOnClose
        mask={false}
        maskClosable={false}
        modalRender={(modal) => (
          <Draggable
            disabled={disabled}
            bounds={bounds}
            nodeRef={draggleRef}
            onStart={(event, uiData) => onStart(event, uiData)}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
        styles={{ header: { borderBottom: '2px solid #1a337e', paddingBottom: '10px' } }}
      >
        <div style={{ background: '#eef2ff', padding: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <Text strong style={{ marginRight: '20px' }}>Select</Text>
          <Radio.Group value={entryMode} onChange={(e) => setEntryMode(e.target.value)}>
            <Radio value="single">Single</Radio>
            <Radio value="multiple">Multiple</Radio>
          </Radio.Group>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            entries: [{}]
          }}
        >
          {entryMode === 'single' ? (
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px' }}>
               <Row style={{ borderBottom: '1px solid #333' }}>
                 <Col span={6} style={{ background: 'transparent', padding: '12px', borderRight: '1px solid #333' }}>
                    <Text strong>Give Voice Input</Text>
                 </Col>
                 <Col span={18} style={{ padding: '12px' }}>
                    <Button 
                      icon={<AudioOutlined />} 
                      type={isListening ? "primary" : "dashed"} 
                      danger={isListening}
                      onClick={startVoiceInput}
                    >
                      {isListening ? "Listening..." : "Click to speak description..."}
                    </Button>
                 </Col>
               </Row>
               
               <Row style={{ borderBottom: '1px solid #333' }}>
                 <Col span={6} style={{ background: 'transparent', padding: '12px', borderRight: '1px solid #333' }}>
                    <Text strong>Date / Time</Text>
                 </Col>
                 <Col span={18} style={{ padding: '12px' }}>
                    <Text>{dayjs().format('DD/MM/YYYY HH:mm')}</Text>
                 </Col>
               </Row>

               <Row style={{ borderBottom: '1px solid #333' }}>
                 <Col span={6} style={{ background: 'transparent', padding: '12px', borderRight: '1px solid #333' }}>
                    <Text strong>General Diary Type <span style={{ color: 'red' }}>*</span></Text>
                 </Col>
                 <Col span={18} style={{ padding: '8px 12px' }}>
                    <Form.Item name="entry_type" noStyle rules={[{ required: true }]}>
                      <Select 
                        showSearch 
                        placeholder="Select GD Type" 
                        style={{ width: '100%' }}
                        filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                      >
                        {[...GD_TYPES, 'Others'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) => prevValues.entry_type !== currentValues.entry_type}
                    >
                      {({ getFieldValue }) =>
                        getFieldValue('entry_type') === 'Others' ? (
                          <Form.Item name="custom_entry_type" rules={[{ required: true, message: 'Please specify the custom entry type' }]} style={{ marginTop: '8px', marginBottom: 0 }}>
                            <Input placeholder="Enter custom GD type" />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                 </Col>
               </Row>

               <Row style={{ borderBottom: '1px solid #333' }}>
                 <Col span={6} style={{ background: 'transparent', padding: '8px', borderRight: '1px solid #333', display: 'flex', alignItems: 'center' }}>
                    <Text strong>Entry for (Officer) <span style={{ color: 'red' }}>*</span></Text>
                 </Col>
                 <Col span={18} style={{ padding: '4px 8px' }}>
                    <Form.Item name="officer_name" initialValue={profile?.full_name} noStyle>
                      <Input placeholder="Officer Name" style={{ width: '100%' }} />
                    </Form.Item>
                 </Col>
               </Row>

               <Row style={{ borderBottom: '1px solid #333' }}>
                 <Col span={6} style={{ background: 'transparent', padding: '8px', borderRight: '1px solid #333', display: 'flex', alignItems: 'center' }}>
                    <Text strong>Subject</Text>
                 </Col>
                 <Col span={18} style={{ padding: '4px 8px' }}>
                    <Form.Item name="subject" style={{ marginBottom: 0 }}>
                      <Input 
                        maxLength={1000} 
                        onChange={(e) => setSubjectCharCount(e.target.value.length)}
                        placeholder="GD Subject" 
                      />
                    </Form.Item>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#999', marginTop: '-4px' }}>
                      Characters Remaining: {1000 - subjectCharCount}
                    </div>
                 </Col>
               </Row>

               <Row>
                  <Col span={6} style={{ background: 'transparent', padding: '8px', borderRight: '1px solid #333', display: 'flex', alignItems: 'flex-start' }}>
                     <Text strong style={{ marginTop: '8px' }}>General Diary Brief <span style={{ color: 'red' }}>*</span></Text>
                  </Col>
                 <Col span={18} style={{ padding: '4px 8px' }}>
                    <Form.Item name="description" style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                      <Input.TextArea 
                        rows={6} 
                        maxLength={100000}
                        onChange={(e) => setDescCharCount(e.target.value.length)}
                        placeholder="Enter diary brief..." 
                      />
                    </Form.Item>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#999', marginTop: '-4px' }}>
                      Characters Remaining: {100000 - descCharCount}
                    </div>
                 </Col>
               </Row>
            </div>
          ) : (
            <Form.List name="entries">
              {(fields, { add, remove }) => (
                <>
                  <Table
                    dataSource={fields}
                    pagination={false}
                    rowKey="key"
                    bordered
                    size="small"
                    columns={[
                      {
                        title: 'S.No.',
                        dataIndex: 'index',
                        width: 60,
                        render: (_, __, index) => index + 1,
                      },
                      {
                        title: (<span>General Diary Type <span style={{ color: 'red' }}>*</span></span>),
                        dataIndex: 'entry_type',
                        render: (_, field) => (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                             <Form.Item
                               {...field}
                               name={[field.name, 'entry_type']}
                               noStyle
                               rules={[{ required: true }]}
                             >
                               <Select 
                                 showSearch 
                                 size="small" 
                                 style={{ width: '100%' }}
                                 filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                               >
                                 {[...GD_TYPES, 'Others'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                               </Select>
                             </Form.Item>
                             <Form.Item
                               noStyle
                               shouldUpdate={(prevValues, currentValues) => {
                                 const prevList = prevValues.entries || [];
                                 const currList = currentValues.entries || [];
                                 return prevList[field.name]?.entry_type !== currList[field.name]?.entry_type;
                               }}
                             >
                               {({ getFieldValue }) => {
                                 const entries = getFieldValue('entries') || [];
                                 return entries[field.name]?.entry_type === 'Others' ? (
                                   <Form.Item 
                                     {...field}
                                     name={[field.name, 'custom_entry_type']} 
                                     rules={[{ required: true, message: 'Specify custom type' }]} 
                                     style={{ marginBottom: 0 }}
                                   >
                                     <Input size="small" placeholder="Custom type" />
                                   </Form.Item>
                                 ) : null;
                               }}
                             </Form.Item>
                           </div>
                        ),
                      },
                      {
                        title: (<span>Entry for (Officer) <span style={{ color: 'red' }}>*</span></span>),
                        render: (_, field) => (
                           <Form.Item name={[field.name, 'officer_name']} initialValue={profile?.full_name} noStyle>
                            <Input size="small" placeholder="Officer Name" />
                          </Form.Item>
                        )
                      },
                      {
                        title: 'Subject',
                        render: (_, field) => (
                          <Form.Item
                            {...field}
                            name={[field.name, 'subject']}
                            noStyle
                          >
                            <Input size="small" placeholder="Subject" />
                          </Form.Item>
                        ),
                      },
                      {
                        title: (<span>Description <span style={{ color: 'red' }}>*</span></span>),
                        width: 300,
                        render: (_, field) => (
                          <Form.Item
                            {...field}
                            name={[field.name, 'description']}
                            noStyle
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea 
                              autoSize={{ minRows: 1, maxRows: 3 }} 
                              size="small" 
                            />
                          </Form.Item>
                        ),
                      },
                      {
                        title: 'Delete',
                        width: 70,
                        render: (_, field) => (
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => remove(field.name)}
                            disabled={fields.length === 1}
                          />
                        ),
                      },
                    ]}
                  />
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      Add New
                    </Button>
                  </div>
                </>
              )}
            </Form.List>
          )}
        </Form>
      </Modal>

      {/* Export Selection Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Export General Diary Report</span>
            <Button type="text" icon={<CloseOutlined style={{ color: 'red', fontSize: '20px' }} />} onClick={() => setIsExportModalOpen(false)} />
          </div>
        }
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        closable={false}
        footer={null}
        width={500}
        styles={{ header: { borderBottom: '1px solid #333', padding: '10px 20px' } }}
      >
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
             <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>1. Select Date Range:</Text>
             <RangePicker 
               style={{ width: '100%' }} 
               size="large"
               onChange={(dates) => {
                 if (dates) {
                   setExportDateRange({ ...exportDateRange, startDate: dates[0].format('YYYY-MM-DD'), endDate: dates[1].format('YYYY-MM-DD') });
                 } else {
                   setExportDateRange(null);
                 }
               }}
             />
          </div>

          <div style={{ marginBottom: '32px' }}>
             <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>2. Filter by Type (Optional):</Text>
             <Select
               showSearch
               style={{ width: '100%' }}
               size="large"
               placeholder="All Types (Default)"
               allowClear
               onChange={(val) => setExportDateRange(prev => ({ ...prev, entryType: val === 'all' ? '' : val }))}
             >
               <Select.Option value="all" style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  Total Diary Report (All Entries)
               </Select.Option>
               {GD_TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
             </Select>
          </div>
          <Space size="middle" style={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              type="primary" 
              size="large"
              icon={<FilePdfOutlined />} 
              onClick={() => {
                exportPDF();
                setIsExportModalOpen(false);
              }}
              style={{ minWidth: '150px' }}
            >
              Download PDF
            </Button>
            <Button 
              size="large"
              style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a', minWidth: '150px' }}
              icon={<FileExcelOutlined />} 
              onClick={() => {
                exportExcel();
                setIsExportModalOpen(false);
              }}
            >
              Download Excel
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Staff Status Board Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Thana Staff Digital Roll Call (Advanced Status)</span>
             <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddStaffModalOpen(true)}>Add Member</Button>
                <Tag 
                  color={staffFilter === 'role:io' ? 'green' : 'default'} 
                  style={{ cursor: 'pointer', border: staffFilter === 'role:io' ? '2px solid #52c41a' : 'none' }}
                  onClick={() => setStaffFilter(staffFilter === 'role:io' ? 'all' : 'role:io')}
                >
                  {staffData.filter(s => s.role === 'io').length} Active IOs
                </Tag>
                <Tag 
                   color={staffFilter === 'all' ? 'blue' : 'default'} 
                   style={{ cursor: 'pointer', border: staffFilter === 'all' ? '2px solid #1890ff' : 'none' }}
                   onClick={() => setStaffFilter('all')}
                >
                   {staffData.length} Total Members
                </Tag>
             </Space>
          </div>
        }
        open={isStaffModalOpen}
        onCancel={() => {
           setIsStaffModalOpen(false);
           setStaffFilter('all'); // Reset filter on close
        }}
        footer={null}
        width={1000}
        styles={{ header: { borderBottom: '1px solid #333', padding: '10px 20px' } }}
      >
        <div style={{ padding: '10px' }}>
           <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', border: staffFilter === 'all' ? '2px solid #1890ff' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('all')}>
                     <Statistic title="Total Staff" value={staffData.length} valueStyle={{ fontSize: '15px', fontWeight: 'bold' }} />
                  </Card>
               </Col>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', background: '#f0f5ff', border: staffFilter === 'Station Duty' ? '2px solid #2f54eb' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('Station Duty')}>
                     <Statistic title="Station Duty" value={staffData.filter(s => s.current_duty === 'Station Duty').length} valueStyle={{ color: '#2f54eb', fontSize: '15px' }} />
                  </Card>
               </Col>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', background: '#fff1f0', border: staffFilter === 'Raid' ? '2px solid #f5222d' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('Raid')}>
                     <Statistic title="On Raid" value={staffData.filter(s => s.current_duty === 'Raid').length} valueStyle={{ color: '#f5222d', fontSize: '15px' }} />
                  </Card>
               </Col>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', background: '#e6fffb', border: staffFilter === 'Naka Duty' ? '2px solid #13c2c2' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('Naka Duty')}>
                     <Statistic title="Naka Duty" value={staffData.filter(s => s.current_duty === 'Naka Duty').length} valueStyle={{ color: '#13c2c2', fontSize: '15px' }} />
                  </Card>
               </Col>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', background: '#f9f0ff', border: staffFilter === 'VIP Duty' ? '2px solid #722ed1' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('VIP Duty')}>
                     <Statistic title="VIP Duty" value={staffData.filter(s => s.current_duty === 'VIP Duty').length} valueStyle={{ color: '#722ed1', fontSize: '15px' }} />
                  </Card>
               </Col>
               <Col span={4}>
                  <Card size="small" hoverable style={{ borderRadius: '8px', background: '#fffbe6', border: staffFilter === 'field_other' ? '2px solid #d4b106' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('field_other')}>
                     <Statistic title="Other Duties" value={staffData.filter(s => !['Station Duty', 'Raid', 'VIP Duty', 'Naka Duty', 'CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty)).length} valueStyle={{ color: '#d4b106', fontSize: '15px' }} />
                  </Card>
               </Col>
               <Col span={24}>
                  <Card size="small" hoverable style={{ borderRadius: '10px', background: 'linear-gradient(90deg, #fff7e6 0%, #fff1f0 100%)', marginTop: '8px', border: staffFilter === 'leave_all' ? '2px solid #fa8c16' : 'none', cursor: 'pointer' }} onClick={() => setStaffFilter('leave_all')}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px' }}>
                        <Space><CalendarOutlined style={{ fontSize: '20px', color: '#fa8c16' }} /><Text strong style={{ fontSize: '16px', color: '#fa8c16' }}>On Leave (CL / PL / Medical / EL):</Text></Space>
                        <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>{staffData.filter(s => ['CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty)).length} Members</Title>
                     </div>
                  </Card>
               </Col>
            </Row>

           <Table 
               dataSource={[...staffData]
                 .filter(s => {
                     if (staffFilter === 'all') return true;
                     if (staffFilter === 'role:io') return s.role === 'io';
                     if (staffFilter === 'leave_all') return ['CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty);
                     if (staffFilter === 'field_other') return !['Station Duty', 'Raid', 'VIP Duty', 'Naka Duty', 'CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty);
                     return s.current_duty === staffFilter;
                  })
                 .sort((a, b) => {
                    // Rank Hierarchy Priority Mapping
                    const rankPriority = {
                       'Inspector': 1,
                       'SI': 2,
                       'Sub-Inspector': 2,
                       'ASI': 3,
                       'Asst Sub-Inspector': 3,
                       'HC': 4,
                       'Head Constable': 4,
                       'Constable': 5
                    };

                    const priorityA = rankPriority[a.rank] || 99;
                    const priorityB = rankPriority[b.rank] || 99;

                    // 1. Sort by Rank Priority first (Higher rank = Smaller number = Comes first)
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    
                    // 2. Then by Role (IOs first within the same rank)
                    if (a.role === 'io' && b.role !== 'io') return -1;
                    if (a.role !== 'io' && b.role === 'io') return 1;
                    
                    // 3. Fallback to name alphabetic
                    return a.full_name.localeCompare(b.full_name);
                 })
               }
               size="middle"
               columns={[
                 { title: 'S.No', width: 70, align: 'center', render: (_, __, index) => <Text type="secondary">{index + 1}</Text> },
                 { title: 'Rank & Name', dataIndex: 'full_name', sorter: (a, b) => a.full_name.localeCompare(b.full_name), render: (text, record) => (
                   <Space>
                     <Text strong style={{ color: '#aaa', minWidth: '40px' }}>{record.rank}</Text>
                     <Text>{text}</Text>
                     {record.role === 'io' && <Tag color="green" style={{ fontSize: '10px' }}>IO</Tag>}
                   </Space>
                 )},
                 { title: 'Phone Number', dataIndex: 'phone_number', render: (val) => (
                   <Button type="link" icon={<PhoneOutlined />} onClick={() => window.open(`tel:${val}`)}>{val}</Button>
                 )},
                 { title: 'Current Duty', dataIndex: 'current_duty', sorter: (a, b) => a.current_duty.localeCompare(b.current_duty), render: (val) => (
                   <Tag color={val === 'CL' ? 'orange' : val === 'Raid' ? 'red' : val === 'VIP Duty' ? 'purple' : val === 'Naka Duty' ? 'cyan' : 'blue'}>{val}</Tag>
                 )},
                 { title: 'Location', dataIndex: 'duty_location' },
                 { title: 'Action', render: (_, record) => (
                   <Space>
                      <Tooltip title="Edit Profile">
                        <Button 
                          icon={<EditOutlined />} 
                          onClick={() => {
                             staffForm.setFieldsValue({ 
                               id: record.id, 
                               full_name: record.full_name,
                               rank: record.rank,
                               phone_number: record.phone_number,
                               current_duty: record.current_duty, 
                               duty_location: record.duty_location,
                               badge_number: record.badge_number
                             });
                             Modal.confirm({
                               title: `Update Profile: ${record.full_name}`,
                               width: 600,
                               content: (
                                 <Form form={staffForm} layout="vertical">
                                    <Form.Item name="id" hidden><Input /></Form.Item>
                                    <Row gutter={16}>
                                       <Col span={12}>
                                          <Form.Item label="Full Name" name="full_name"><Input /></Form.Item>
                                       </Col>
                                       <Col span={12}>
                                          <Form.Item label="Rank" name="rank">
                                             <Select>

                                                <Select.Option value="Inspector">Inspector</Select.Option>
                                                <Select.Option value="SI">SI</Select.Option>
                                                <Select.Option value="ASI">ASI</Select.Option>
                                                <Select.Option value="HC">HC</Select.Option>
                                                <Select.Option value="Constable">Constable</Select.Option>
                                             
                     </Select>
                                          </Form.Item>
                                       </Col>
                                    </Row>
                                    <Row gutter={16}>
                                       <Col span={12}>
                                          <Form.Item label="Phone Number" name="phone_number"><Input /></Form.Item>
                                       </Col>
                                       <Col span={12}>
                                          <Form.Item label="Badge Number" name="badge_number"><Input /></Form.Item>
                                       </Col>
                                    </Row>
                                    <Form.Item label="Duty Type" name="current_duty">
                                       <Select>

                                          <Select.Option value="Station Duty">Station Duty</Select.Option>
                                          <Select.Option value="CL">CL (Leave)</Select.Option>
                                          <Select.Option value="Raid">Raid</Select.Option>
                                          <Select.Option value="VIP Duty">VIP Duty</Select.Option>
                                          <Select.Option value="Naka Duty">Naka Duty</Select.Option>
                                          <Select.Option value="Patrol">Patrol</Select.Option>
                                          <Select.Option value="Investigation">Investigation</Select.Option>
                                          <Select.Option value="Court Duty">Court Duty</Select.Option>
                                          <Select.Option value="Others">Others</Select.Option>
                                       
                     </Select>
                                    </Form.Item>
                                    <Form.Item label="Detailed Location" name="duty_location">
                                       <Input placeholder="E.g. Hansi Road, Sector 14, etc." />
                                    </Form.Item>
                                 </Form>
                               ),
                               onOk: () => updateStaffProfile(staffForm.getFieldsValue())
                             });
                          }} 
                        />
                      </Tooltip>
                      <Tooltip title="Delete (Transfer)">
                        <Button 
                          danger 
                          icon={<DeleteOutlined />} 
                          onClick={() => {
                            Modal.confirm({
                              title: 'Confirm Transfer/Deletion',
                              content: `Are you sure you want to remove ${record.full_name} from this station?`,
                              okText: 'Yes, Remove',
                              cancelText: 'Cancel',
                              onOk: () => deleteStaffMember(record.id)
                            });
                          }}
                        />
                      </Tooltip>
                   </Space>
                )}
              ]}
              pagination={false}
              scroll={{ y: 400 }}
           />
        </div>
      </Modal>

      {/* Add New Staff Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Register New Thana Staff</span>
            <Button type="text" icon={<CloseOutlined style={{ color: 'red', fontSize: '20px' }} />} onClick={() => setIsAddStaffModalOpen(false)} />
          </div>
        }
        open={isAddStaffModalOpen}
        onCancel={() => setIsAddStaffModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsAddStaffModalOpen(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => addStaffForm.submit()}>Save Member</Button>
        ]}
        width={600}
        styles={{ header: { borderBottom: '1px solid #333', padding: '10px 20px' } }}
      >
        <Form form={addStaffForm} layout="vertical" onFinish={addStaffMember}>
           <Row gutter={16}>
              <Col span={12}>
                 <Form.Item label="Full Name" name="full_name" rules={[{ required: true }]}>
                    <Input placeholder="E.g. SI Ramesh" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="Rank" name="rank" rules={[{ required: true }]}>
                    <Select placeholder="Select Rank">
                       <Select.Option value="Inspector">Inspector</Select.Option>
                       <Select.Option value="SI">Sub-Inspector (SI)</Select.Option>
                       <Select.Option value="ASI">Assistant Sub-Inspector (ASI)</Select.Option>
                       <Select.Option value="HC">Head Constable (HC)</Select.Option>
                       <Select.Option value="Constable">Constable</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
           </Row>
           <Row gutter={16}>
              <Col span={12}>
                 <Form.Item label="Phone Number" name="phone_number" rules={[{ required: true }]}>
                    <Input placeholder="10 Digit Number" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="Badge / Belt Number" name="badge_number">
                    <Input placeholder="E.g. 1234/HNS" />
                 </Form.Item>
              </Col>
           </Row>
           <Row gutter={16}>
              <Col span={12}>
                 <Form.Item label="System Role" name="role" initialValue="constable">
                    <Select>

                       <Select.Option value="io">Investigating Officer (IO)</Select.Option>
                       <Select.Option value="constable">General Staff</Select.Option>
                       <Select.Option value="sho">SHO / Admin</Select.Option>
                    
                     </Select>
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="Initial Duty" name="current_duty" initialValue="Station Duty">
                    <Select>

                       <Select.Option value="Station Duty">Station Duty</Select.Option>
                       <Select.Option value="VIP Duty">VIP Duty</Select.Option>
                       <Select.Option value="Naka Duty">Naka Duty</Select.Option>
                       <Select.Option value="Raid">Raid</Select.Option>
                       <Select.Option value="Patrol">Patrol/Beat</Select.Option>
                        <Select.Option value="Investigation">Investigation</Select.Option>
                        <Select.Option value="CL">Leave (CL)</Select.Option>
                        <Select.Option value="PL">Leave (PL)</Select.Option>
                        <Select.Option value="Medical Leave">Medical Leave</Select.Option>
                        <Select.Option value="EL">Leave (EL)</Select.Option>
                       <Select.Option value="Others">Others</Select.Option>
                    
                     </Select>
                 </Form.Item>
              </Col>
           </Row>
        </Form>
      </Modal>

      {/* Advance Search Modal */}
      <Modal
        title={
          <div 
             style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'move', paddingRight: '20px' }}
             onMouseOver={() => { if (disabled) setDisabled(false); }}
             onMouseOut={() => setDisabled(true)}
          >
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>General Diary : Advance Search</span>
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        closable={false}
        mask={false}
        maskClosable={false}
        modalRender={(modal) => (
          <Draggable
            disabled={disabled}
            bounds={bounds}
            nodeRef={draggleRef}
            onStart={(event, uiData) => onStart(event, uiData)}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
        footer={[
          <Button key="search" type="primary" onClick={() => {
            fetchGD();
            setIsSearchModalOpen(false);
          }}>Search</Button>,
          <Button key="clear" onClick={() => {
            setFilters({ entryType: '', startDate: '', endDate: '', officerId: '', search: '' });
            searchForm.resetFields();
          }}>Clear</Button>,
          <Button key="close" onClick={() => setIsSearchModalOpen(false)}>Close</Button>
        ]}
        width={800}
        styles={{ header: { borderBottom: '1px solid #333', padding: '10px 20px' } }}
      >
        <Form form={searchForm} layout="vertical">
          <div style={{ padding: '10px 0' }}>
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <Form.Item label={<Text strong>Police District</Text>} name="district" initialValue="PANCHKULA">
                  <Select 
                    showSearch
                    placeholder="Select District" 
                    size="large" 
                    style={{ width: '100%' }}
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())}
                  >
                    {['AMBALA', 'BHIWANI', 'CHARKHI DADRI', 'FARIDABAD', 'FATEHABAD', 'GURUGRAM', 'HANSI', 'HISAR', 'JHAJJAR', 'JIND', 'KAITHAL', 'KARNAL', 'KURUKSHETRA', 'MAHENDRAGARH', 'NUH', 'PALWAL', 'PANCHKULA', 'PANIPAT', 'REWARI', 'ROHTAK', 'SIRSA', 'SONIPAT', 'YAMUNANAGAR'].map(d => (
                       <Select.Option key={d} value={d}>{d}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text strong>General Diary Type</Text>} name="entryType">
                  <Select 
                    showSearch
                    size="large"
                    placeholder="Search specific GD Type..." 
                    style={{ width: '100%' }} 
                    filterOption={(input, option) => (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase())}
                    onChange={(v) => handleFilterChange('entryType', v)}
                    allowClear
                  >
                     {[...GD_TYPES, 'Others'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label={<Text strong>Date Range (From)</Text>} name="startDate">
                  <DatePicker 
                    format="DD/MM/YYYY" 
                    size="large"
                    style={{ width: '100%' }} 
                    onChange={(d) => handleFilterChange('startDate', d ? d.format('YYYY-MM-DD') : '')} 
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text strong>Date Range (To)</Text>} name="endDate">
                  <DatePicker 
                    format="DD/MM/YYYY" 
                    size="large"
                    style={{ width: '100%' }} 
                    onChange={(d) => handleFilterChange('endDate', d ? d.format('YYYY-MM-DD') : '')} 
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item label={<Text strong>Exact GD Number</Text>} name="gdNumber">
                   <Input prefix={<SearchOutlined style={{ color: '#bfbfbf', marginRight: '6px' }} />} size="large" placeholder="E.g. GD/2026/04/..." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text strong>Entry For (Officer)</Text>} name="officerId">
                  <Select 
                    showSearch
                    placeholder="Filter by assigned Officer" 
                    size="large" 
                    style={{ width: '100%' }} 
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())}
                  >
                     <Select.Option value={profile?.id}>{profile?.full_name}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      {/* Entry Details & Timeline Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
             <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '18px' }}>General Diary Entry Details</span>
             <Tag color="blue">{selectedEntry?.gd_number}</Tag>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />}>Print Entry</Button>
        ]}
        width={900}
        styles={{ header: { borderBottom: '2px solid #1890ff', padding: '10px 20px' } }}
      >
        {selectedEntry && (
          <div style={{ padding: '10px' }}>
            <Descriptions 
               bordered 
               size="small" 
               column={2}
               labelStyle={{ background: 'rgba(24,144,255,0.1)', color: '#1890ff', fontWeight: 'bold' }}
               contentStyle={{ color: '#fff', background: 'transparent' }}
            >
               <Descriptions.Item label="GD Number">{selectedEntry.gd_number}</Descriptions.Item>
               <Descriptions.Item label="Date & Time">{dayjs(selectedEntry.date_time).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
               <Descriptions.Item label="Entry Type"><Tag color="blue">{selectedEntry.entry_type}</Tag></Descriptions.Item>
               <Descriptions.Item label="Officer Name">{selectedEntry.officer_name}</Descriptions.Item>
               {selectedEntry.subject && <Descriptions.Item label="Subject" span={2}>{selectedEntry.subject}</Descriptions.Item>}
               <Descriptions.Item label="Description" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap', minHeight: '100px' }}>{selectedEntry.description}</div>
               </Descriptions.Item>
               <Descriptions.Item label="Police Station">{selectedEntry.station_id || 'hq'}</Descriptions.Item>
               <Descriptions.Item label="Office Name">District HQ</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ color: '#1890ff', borderColor: '#333' }}>Activity History</Divider>
            <Timeline 
              items={[
                {
                  color: 'green',
                  children: <Text style={{ color: '#eee' }}>Entry Registered at {dayjs(selectedEntry.created_at).format('HH:mm:ss')}</Text>,
                },
                {
                  children: <Text style={{ color: '#eee' }}>Assigned to {selectedEntry.officer_name}</Text>,
                },
                selectedEntry.related_fir_id ? {
                  color: 'blue',
                  children: <Text style={{ color: '#eee' }}>Linked to FIR No: {selectedEntry.related_fir_id}</Text>,
                } : null
              ].filter(Boolean)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
