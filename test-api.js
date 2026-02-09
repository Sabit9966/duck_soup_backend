// Test script for backend API
const testAPI = async () => {
    const baseURL = 'http://localhost:5000/api';

    console.log('🧪 Testing Dux-Soup Backend API\n');

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
        const healthRes = await fetch('http://localhost:5000/health');
        const healthData = await healthRes.json();
        console.log('✅ Health Check:', healthData);
    } catch (error) {
        console.error('❌ Health Check Failed:', error.message);
    }

    // Test 2: Register User
    console.log('\n2️⃣ Testing User Registration...');
    let token = '';
    try {
        const registerRes = await fetch(`${baseURL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser' + Date.now(),
                email: `test${Date.now()}@example.com`,
                password: 'password123'
            })
        });
        const registerData = await registerRes.json();
        console.log('✅ Registration:', registerData);
        if (registerData.success) {
            token = registerData.data.token;
            console.log('🔑 Token received:', token.substring(0, 20) + '...');
        }
    } catch (error) {
        console.error('❌ Registration Failed:', error.message);
    }

    if (!token) {
        console.log('\n⚠️ No token received, stopping tests');
        return;
    }

    // Test 3: Get Profile
    console.log('\n3️⃣ Testing Get Profile...');
    try {
        const profileRes = await fetch(`${baseURL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        console.log('✅ Profile:', profileData);
    } catch (error) {
        console.error('❌ Get Profile Failed:', error.message);
    }

    // Test 4: Get Stats
    console.log('\n4️⃣ Testing Get Stats...');
    try {
        const statsRes = await fetch(`${baseURL}/automation/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        console.log('✅ Stats:', statsData);
    } catch (error) {
        console.error('❌ Get Stats Failed:', error.message);
    }

    // Test 5: Update Stats
    console.log('\n5️⃣ Testing Update Stats...');
    try {
        const updateStatsRes = await fetch(`${baseURL}/automation/stats`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ statType: 'profileVisit' })
        });
        const updateStatsData = await updateStatsRes.json();
        console.log('✅ Updated Stats:', updateStatsData);
    } catch (error) {
        console.error('❌ Update Stats Failed:', error.message);
    }

    // Test 6: Get Settings
    console.log('\n6️⃣ Testing Get Settings...');
    try {
        const settingsRes = await fetch(`${baseURL}/automation/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const settingsData = await settingsRes.json();
        console.log('✅ Settings:', settingsData);
    } catch (error) {
        console.error('❌ Get Settings Failed:', error.message);
    }

    // Test 7: Create Activity Log
    console.log('\n7️⃣ Testing Create Activity Log...');
    try {
        const logRes = await fetch(`${baseURL}/activity/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'profileVisit',
                details: 'Test profile visit',
                success: true
            })
        });
        const logData = await logRes.json();
        console.log('✅ Activity Log Created:', logData);
    } catch (error) {
        console.error('❌ Create Activity Log Failed:', error.message);
    }

    // Test 8: Get Activity Logs
    console.log('\n8️⃣ Testing Get Activity Logs...');
    try {
        const logsRes = await fetch(`${baseURL}/activity/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        console.log('✅ Activity Logs:', logsData);
    } catch (error) {
        console.error('❌ Get Activity Logs Failed:', error.message);
    }

    console.log('\n✨ All tests completed!');
};

testAPI();
