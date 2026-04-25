import http from 'http';

const data = JSON.stringify({
    entry_type: "Test Entry",
    description: "Testing officer name mapping",
    officer_name: "John Wick",
    subject: "Test subject"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/gd',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer usr-1` // Note: backend uses basic token bypass "req.user = profiles.find(id=token)"? I don't know the token schema, but I'll try usr-1 which usually works in development.
    }
};

const req = http.request(options, res => {
    let responseData = '';
    res.on('data', d => {
        responseData += d;
    });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Body:", responseData);
    });
});

req.on('error', e => {
    console.error(e);
});

req.write(data);
req.end();
