import fs from 'fs';
import path from 'path';

const filePath = 'd:/cms smart GD 2/cms-haryana-police/src/pages/GD/GDPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Reorganize Cards Row
// Use a more robust regex to find the Row
const rowRegex = /<Row gutter=\{\[8, 8\]\} style=\{\{ marginBottom: '.*?px' \}\}>([\s\S]*?)<\/Row>/;
const match = content.match(rowRegex);

if (match) {
    const newCardsRow = `<Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
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
            </Row>`;
    content = content.replace(rowRegex, newCardsRow);
    console.log('✅ Updated Cards Row');
} else {
    console.log('❌ Cards Row not found');
}

// 2. Update Table Filter logic
const tableFilterRegex = /\.filter\(s => \{[\s\S]*?if \(staffFilter === 'field_other'\) return !\['Station Duty','CL','Raid','VIP Duty','Naka Duty'\].includes\(s\.current_duty\);[\s\S]*?\}\)/;
const tableFilterNew = `.filter(s => {
                     if (staffFilter === 'all') return true;
                     if (staffFilter === 'role:io') return s.role === 'io';
                     if (staffFilter === 'leave_all') return ['CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty);
                     if (staffFilter === 'field_other') return !['Station Duty', 'Raid', 'VIP Duty', 'Naka Duty', 'CL', 'PL', 'Medical Leave', 'EL'].includes(s.current_duty);
                     return s.current_duty === staffFilter;
                  })`;
content = content.replace(tableFilterRegex, tableFilterNew);

// 3. Update Form Select options
const selectRegex = /<Select\.Option value="CL">Leave \(CL\)<\/Select\.Option>/g;
const selectNew = `<Select.Option value="Patrol">Patrol/Beat</Select.Option>
                        <Select.Option value="Investigation">Investigation</Select.Option>
                        <Select.Option value="CL">Leave (CL)</Select.Option>
                        <Select.Option value="PL">Leave (PL)</Select.Option>
                        <Select.Option value="Medical Leave">Medical Leave</Select.Option>
                        <Select.Option value="EL">Leave (EL)</Select.Option>`;
content = content.replace(selectRegex, selectNew);

fs.writeFileSync(filePath, content);
console.log('✅ File updated successfully!');
