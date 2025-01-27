import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './sendMessage.css';
import {
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    Button,
    TextareaAutosize,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Cancel } from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Navbar from './navbar';

const SendMessage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isTestMessage } = location.state || {};
    const { selectedRows } = location.state || {};

    const [message, setMessage] = useState('');
    const [sendMode, setSendMode] = useState('sms');
    const [results, setResults] = useState([]);
    const [showReportButton, setShowReportButton] = useState(false);
    const [showReportPopup, setShowReportPopup] = useState(false);
    const [headers, setHeaders] = useState([]); // Store headers dynamically
    const [activeSpreadsheetId, setActiveSpreadsheetId] = useState(null); // Store active spreadsheet ID
    const [files, setFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [testMobileNumber, setTestMobileNumber] = useState('');

    const apiUrl1 = process.env.NODE_ENV === 'development'
        ? process.env.REACT_APP_LOCAL_API_URL
        : process.env.REACT_APP_PRODUCTION_API_URL;

    // Fetch headers and active spreadsheet ID
    useEffect(() => {
        const fetchHeaders = async () => {
            try {
                // Fetch the active spreadsheet ID
                const activeSpreadsheetResponse = await axios.get(`${apiUrl1}/get-active-spreadsheet`, {
                    withCredentials: true,
                });
                const activeSpreadsheetId = activeSpreadsheetResponse.data.activeSpreadsheetId;

                if (!activeSpreadsheetId) {
                    toast.error('No active spreadsheet found. Please set an active spreadsheet first.');
                    return;
                }

                setActiveSpreadsheetId(activeSpreadsheetId);

                // Fetch headers dynamically
                const headersResponse = await axios.get(`${apiUrl1}/get-spreadsheet-headers`, {
                    params: { spreadsheetId: activeSpreadsheetId },
                    withCredentials: true,
                });
                const allHeaders = headersResponse.data.headers;

                if (!allHeaders || allHeaders.length === 0) {
                    alert('No headers found in the spreadsheet.');
                    return;
                }

                setHeaders(allHeaders);
            } catch (error) {
                console.error('Error fetching headers:', error);
                alert('Failed to fetch headers. Please try again.');
            }
        };

        fetchHeaders();
    }, []);

    // Dynamically identify column indices
    const getColumnIndex = (headerName) => {
        return headers.indexOf(headerName);
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const validFiles = selectedFiles.filter((file) => file.type.startsWith('image/')); // Only allow images

        if (validFiles.length !== selectedFiles.length) {
            alert('Only image files (JPEG, PNG) are allowed.');
        }

        setFiles(validFiles);

        // Generate previews for the selected images
        const previews = validFiles.map((file) => URL.createObjectURL(file));
        setFilePreviews(previews);
    };

    const handleSendMessage = async () => {
        if (!message.trim() && files.length === 0) {
            alert("Please enter a message or attach at least one file.");
            return;
        }
    
        if (isTestMessage && !testMobileNumber.trim()) {
            alert("Please enter a mobile number for the test message.");
            return;
        }
    
        if (!isTestMessage && (!selectedRows || selectedRows.length === 0)) {
            alert("Please select at least one recipient.");
            return;
        }
    
        let activeSpreadsheetId;
        let headers;
    
        try {
            // Fetch the active spreadsheet ID
            const activeSpreadsheetResponse = await axios.get(`${apiUrl1}/get-active-spreadsheet`, {
                withCredentials: true,
            });
    
            activeSpreadsheetId = activeSpreadsheetResponse.data.activeSpreadsheetId;
            console.log("active", activeSpreadsheetId);
    
            if (!activeSpreadsheetId) {
                toast.error("No active spreadsheet found. Please set an active spreadsheet first.");
                return;
            }
    
            setActiveSpreadsheetId(activeSpreadsheetId);
    
            // Fetch spreadsheet headers dynamically
            const headersResponse = await axios.get(`${apiUrl1}/get-spreadsheet-headers`, {
                params: { spreadsheetId: activeSpreadsheetId },
                withCredentials: true,
            });
    
            headers = headersResponse.data.headers;
            if (!Array.isArray(headers) || headers.length === 0) {
                throw new Error("Headers not found or invalid format in the spreadsheet.");
            }
    
            console.log("Header data:", headers);
            setHeaders(headers);
        } catch (error) {
            console.error("Error fetching spreadsheet headers or active spreadsheet ID:", error);
            alert("Failed to fetch spreadsheet headers or active spreadsheet details.");
            return;
        }
    
        const mobileColumnVariants = [
            'mobilenumber', 'mobile no', 'Mobile Number', 'MobileNumber', 'MOB', 'mob',
        ];
    
        let formattedRecipients;
    
        if (isTestMessage) {
            formattedRecipients = [
                {
                    phone: testMobileNumber.trim(),
                },
            ];
        } else {
            formattedRecipients = selectedRows.map((row) => {
                let phone = '';
    
                // Find phone column dynamically
                if (Array.isArray(headers)) {
                    for (let variant of mobileColumnVariants) {
                        const phoneIndex = headers.indexOf(variant);
                        if (phoneIndex !== -1) {
                            phone = row[phoneIndex]?.trim() || '';
                            break;
                        }
                    }
                }
    
                if (!phone) {
                    console.warn("No phone number found for row:", row);
                }
    
                // Format all fields dynamically based on headers
                const formattedRow = {};
                headers.forEach((header, index) => {
                    formattedRow[header] = row[index]?.trim() || '';
                });
    
                formattedRow.phone = phone; // Add phone field
                return formattedRow;
            });
        }
    
        const apiUrl =
            sendMode === 'sms'
                ? `${apiUrl1}/send-sms`
                : sendMode === 'whatsapp'
                ? `${apiUrl1}/send-whatsapp`
                : `${apiUrl1}/send-telegram`;
    
        const formData = new FormData();
        formData.append('message', message);
        formData.append('recipients', JSON.stringify(formattedRecipients));
        formData.append('activeSpreadsheetId', activeSpreadsheetId);
    
        files.forEach((file) => {
            formData.append('files', file);
        });
    
        try {
            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResults(response.data.results);
            setShowReportButton(true);
            alert(response.data.message);
        } catch (error) {
            console.error(`Error sending ${sendMode} messages:`, error);
            alert(`Failed to send ${sendMode} messages.`);
        }
    };
    

    const handleShowReport = () => {
        setShowReportPopup(true); // Open the report popup
    };

    const handleCloseReportPopup = () => {
        setShowReportPopup(false); // Close the report popup
    };

    const handleDownloadPDF = () => {
        const input = document.getElementById('report-table'); // Get the table element
        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); // Create a PDF in portrait mode
            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width; // Calculate height
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('report.pdf'); // Download the PDF
        });
    };

    return (
        <>
        <ToastContainer autoClose={3000}/>
            <Navbar />
            <div className="send-message-container">
                <h2>Send Messages</h2>
                {isTestMessage && (
                    <input
                        type="text"
                        placeholder="Mobile No"
                        className="mobile-input"
                        value={testMobileNumber}
                        onChange={(e) => setTestMobileNumber(e.target.value)}
                        style={{
                            width: '100%',
                            height: '40px',
                            marginBottom: '20px',
                            fontSize: '16px',
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                        }}
                    />
                )}
                <TextareaAutosize
                    placeholder="Enter your message here"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                        width: '100%',
                        height: '100px',
                        marginBottom: '20px',
                        fontSize: '16px',
                        padding: '10px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                    }}
                />
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ marginBottom: '20px' }}
                    accept="image/*" // Only allow image files
                />
                {/* Display image previews */}
                <div className="image-previews">
                    {filePreviews.map((preview, index) => (
                        <img
                            key={index}
                            src={preview}
                            alt={`Preview ${index}`}
                            style={{ width: '100px', height: '100px', margin: '5px' }}
                        />
                    ))}
                </div>
                <FormControl component="fieldset" className="send-mode-selector">
                    <FormLabel component="legend">Send via</FormLabel>
                    <RadioGroup
                        row
                        value={sendMode}
                        onChange={(e) => setSendMode(e.target.value)}
                    >
                        <FormControlLabel value="sms" control={<Radio />} label="SMS" />
                        <FormControlLabel value="whatsapp" control={<Radio />} label="WhatsApp" />
                        <FormControlLabel value="telegram" control={<Radio />} label="Telegram" />
                    </RadioGroup>
                </FormControl>
                <div className="actions">
                    <Button variant="contained" color="primary" onClick={handleSendMessage}>
                        Send
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/create-message')}>
                        Cancel
                    </Button>
                </div>

                {/* Show Report Button */}
                {showReportButton && (
                    <div className="report-button-container">
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleShowReport}
                            style={{ marginTop: '20px' }}
                        >
                            Show Report
                        </Button>
                    </div>
                )}

                {/* Report Popup */}
                <Dialog
                    open={showReportPopup}
                    onClose={handleCloseReportPopup}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Message Report</DialogTitle>
                    <DialogContent>
                        <TableContainer component={Paper} id="report-table">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>First Name</TableCell>
                                        <TableCell>Middle Name</TableCell>
                                        <TableCell>Last Name</TableCell>
                                        <TableCell>Mobile</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Message Sent</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {results.map((result, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{result.firstName}</TableCell>
                                            <TableCell>{result.middleName}</TableCell>
                                            <TableCell>{result.lastName}</TableCell>
                                            <TableCell>{result.phone}</TableCell>
                                            <TableCell>{result.email}</TableCell>
                                            <TableCell>
                                                {result.status === 'success' ? (
                                                    <CheckCircle style={{ color: 'green' }} />
                                                ) : (
                                                    <Cancel style={{ color: 'red' }} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseReportPopup} color="primary">
                            Close
                        </Button>
                        <Button onClick={handleDownloadPDF} color="primary">
                            Download PDF
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </>
    );
};

export default SendMessage;