const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.stack));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));
    
    // Listen to all network responses for the upload endpoint
    page.on('response', async res => {
        if (res.url().includes('/api/upload')) {
            console.log('UPLOAD RESPONSE STATUS:', res.status());
            try {
                const body = await res.text();
                console.log('UPLOAD RESPONSE BODY:', body);
            } catch(e) {}
        }
    });
    
    await page.goto('http://localhost:8080/login.html');
    
    await page.type('#email', 'student1@test.com');
    await page.type('#password', 'student123');
    await page.click('form#admin-login-form button[type="submit"]');
    
    await page.waitForNavigation();
    
    console.log('Navigating to student-profile...');
    await page.goto('http://localhost:8080/student-profile.html');
    
    // Check if the profile-avatar-img element exists and its current src
    const avatarSrc = await page.$eval('#profile-avatar-img', el => el.src);
    console.log('AVATAR SRC ON LOAD:', avatarSrc);
    
    // Check if the upload input exists
    const hasUploadInput = await page.$('#profile-pic-upload') !== null;
    console.log('UPLOAD INPUT EXISTS:', hasUploadInput);
    
    await browser.close();
})();
