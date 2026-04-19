import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, AutoComplete, Tooltip, message, Upload, Dropdown, Space, Modal, Steps, Typography, Card } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  CameraOutlined,
  SearchOutlined,
  LoadingOutlined,
  DeleteOutlined,
  DownOutlined,
  GlobalOutlined,
  TranslationOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// Import worker as a URL — Vite resolves this from local node_modules (no CDN needed)
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useAuth } from '../hooks/useAuth';

const { Text, Title } = Typography;

// PDF.js worker will be configured inside the component useEffect to prevent startup crashes


const { Search } = Input;

export default function SmartSearch({ onSearch, onValueChange, initialValue = "" }) {
  const { token } = useAuth();
  const [value, setValue] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition and PDF Worker
  useEffect(() => {
    // Configure PDF.js worker using local file (avoids CDN dependency & version mismatch)
    try {
      if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        console.log('[PDF] Worker configured:', pdfWorkerUrl);
      }
    } catch (err) {
      console.warn('PDF Worker configuration failed:', err);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN'; // Default to Indian English/Hindi mix

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const newText = finalTranscript || interimTranscript;
        if (newText) {
          setValue(newText);
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        message.info('You can speak now...');
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          message.error('Microphone access denied. Please allow it in settings.');
        } else {
          message.error('Voice not recognized, please try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        message.warning('Voice search is not supported in this browser.');
        return;
      }

      // Dynamically set language from state
      recognitionRef.current.lang = voiceLang;
      recognitionRef.current.start();
    }
  };


  // ----- Helper: render one PDF page to canvas and return dataURL -----
  const renderPdfPageToCanvas = (page, scale = 2.0) => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    return page.render({ canvasContext: ctx, viewport }).promise.then(() => canvas);
  };

  // ----- Helper: OCR one canvas element -----
  const ocrCanvas = (canvas, pageNum, total) => {
    message.loading({
      content: `OCR: Page ${pageNum}/${total} processing...`,
      key: 'ocr',
      duration: 0
    });
    return Tesseract.recognize(canvas, 'eng+hin', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`Page ${pageNum} OCR: ${Math.round(m.progress * 100)}%`);
        }
      }
    }).then(r => r.data.text.trim());
  };

  // ----- Main OCR handler -----
  const handleOcr = async (file) => {
    setIsOcrLoading(true);

    // --- PDF handling ---
    if (file.type === 'application/pdf') {
      message.loading({ content: 'Processing PDF, please wait...', key: 'ocr', duration: 0 });
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const totalPages = pdfDoc.numPages;
        const allText = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const canvas = await renderPdfPageToCanvas(page);
          const pageText = await ocrCanvas(canvas, pageNum, totalPages);
          if (pageText) allText.push(`[Page ${pageNum}]\n${pageText}`);
        }

        const combined = allText.join('\n\n');
        if (!combined.trim()) {
          message.warning({ content: 'No readable text found in PDF.', key: 'ocr', duration: 5 });
        } else {
          setValue(combined);
          if (onValueChange) onValueChange(combined);
          message.success({ content: `PDF successfully process hua! (${totalPages} page${totalPages > 1 ? 's' : ''})`, key: 'ocr', duration: 4 });
        }
      } catch (err) {
        console.error('PDF OCR Error:', err);
        if (err.message && err.message.includes('worker')) {
          message.error({ content: 'PDF Worker error. Please refresh your browser and try again.', key: 'ocr', duration: 6 });
        } else {
          message.error({ content: `Failed to process PDF: ${err.message || 'Unknown error'}`, key: 'ocr', duration: 6 });
        }
      } finally {
        setIsOcrLoading(false);
      }
      return false;
    }

    // --- Image handling ---
    if (!file.type.startsWith('image/')) {
      message.error({ content: 'Only image files or PDF files supported.', key: 'ocr', duration: 4 });
      setIsOcrLoading(false);
      return false;
    }

    message.loading({ content: 'Extracting text, please wait...', key: 'ocr', duration: 0 });
    try {
      const result = await Tesseract.recognize(file, 'eng+hin', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      const extractedText = result.data.text.trim();
      if (!extractedText) {
        message.warning({ content: 'No readable text found.', key: 'ocr', duration: 4 });
      } else {
        setValue(extractedText);
        message.success({ content: `Text extracted!`, key: 'ocr', duration: 3 });
      }
    } catch (err) {
      console.error('OCR Error:', err);
      message.error({ content: 'OCR processing failed.', key: 'ocr', duration: 4 });
    } finally {
      setIsOcrLoading(false);
    }
    return false;
  };

  return (
    <div className="smart-search-container" style={{ width: '100%', marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f0f2f5', padding: '16px', borderRadius: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
          <Search
            placeholder="Search by FIR No, Name, Mobile, or Vehicle Number..."
            enterButton={
              <Button type="primary" size="large" icon={<SearchOutlined />} style={{ borderRadius: '0 12px 12px 0', height: '50px', background: '#1890ff' }}>
                Search
              </Button>
            }
            size="large"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (onValueChange) onValueChange(e.target.value);
            }}
            onSearch={(val) => onSearch(val)}
            allowClear={{ clearIcon: <DeleteOutlined /> }}
            style={{ borderRadius: '12px', flexGrow: 1 }}
          />

        <Space size="middle">
          <Tooltip title="Scan Image or PDF to Search">
            <Upload
              accept="image/*,.pdf"
              showUploadList={false}
              beforeUpload={handleOcr}
            >
              <Button
                shape="circle"
                size="large"
                icon={<CameraOutlined style={{ fontSize: '22px' }} />}
                loading={isOcrLoading}
                style={{
                  height: '50px',
                  width: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1890ff',
                  borderColor: '#1890ff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                }}
              />
            </Upload>
          </Tooltip>

          <Tooltip title={isListening ? "Stop Listening" : "Voice Search"}>
            <Button
              shape="circle"
              size="large"
              type="primary"
              icon={isListening ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={toggleListening}
              danger={isListening}
              style={{
                height: '50px',
                width: '50px',
                backgroundColor: isListening ? '#ff4d4f' : '#1890ff',
                borderColor: isListening ? '#ff4d4f' : '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: '#fff',
                boxShadow: '0 4px 10px rgba(24, 144, 255, 0.3)'
              }}
            />
          </Tooltip>

          <Tooltip title="Help Guide">
            <Button
              shape="circle"
              size="large"
              icon={<QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '22px' }} />}
              onClick={() => setShowHelp(true)}
              style={{
                height: '50px',
                width: '50px',
                background: '#fff',
                border: '2px solid #1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {isListening && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '8px', textAlign: 'center' }}>
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: '#f5222d', fontSize: '16px' }}>
              <LoadingOutlined /> Listening...
            </Text>
            <Text type="secondary" style={{ color: '#8c8c8c' }}>Speak your query clearly</Text>
            {value && <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '6px', border: '1px dashed #d9d9d9' }}>
              <Text italic>"{value}"</Text>
            </div>}
          </Space>
        </div>
      )}

      {/* Training Mode / Help Modal */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}><InfoCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} /> How to search?</Title>}
        open={showHelp}
        onOk={() => setShowHelp(false)}
        onCancel={() => setShowHelp(false)}
        footer={[
          <Button key="ok" type="primary" size="large" onClick={() => setShowHelp(false)} style={{ borderRadius: '8px', minWidth: '150px' }}>
            I Understand
          </Button>
        ]}
        width={600}
      >
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={[
            {
              title: 'Type & Search',
              description: 'Type FIR number, name, mobile or vehicle number in the search bar.',
              icon: <SearchOutlined />
            },
            {
              title: 'Voice Search',
              description: 'Click the mic icon and speak your query.',
              icon: <AudioOutlined />
            },
            {
              title: 'OCR Scan',
              description: 'Upload a photo or PDF of the FIR to search automatically.',
              icon: <CameraOutlined />
            },
            {
              title: 'Use Filters',
              description: 'Select District or Case Type to narrow down your results.',
              icon: <DownOutlined />
            }
          ]}
        />
        <Card size="small" style={{ marginTop: '16px', background: '#e6f7ff' }}>
          <Text strong>Examples:</Text>
          <ul>
            <li>"FIR-2026-001"</li>
            <li>"Theft cases in Gurugram"</li>
            <li>"Search for Sandeep"</li>
          </ul>
        </Card>
      </Modal>
    </div>
  );
}
