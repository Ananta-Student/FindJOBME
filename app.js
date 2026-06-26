// ==========================================================================
// FindJOB Dashboard Logic
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  
  // App State
  let state = {
    companies: [],
    skills: [],
    phase2: [],
    keywords: []
  };

  // LocalStorage Keys
  const STORAGE_KEY_COMPANIES = 'findjob_companies_data';
  const STORAGE_KEY_SKILLS = 'findjob_skills_data';
  const STORAGE_KEY_PROFILE = 'findjob_career_profile';

  // Career Profile State
  let profile = {
    track: 'hybrid',
    location: 'flexible',
    project: 'sim_python'
  };

  // DOM Elements
  const tabButtons = document.querySelectorAll('.nav-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  // Stats Elements
  const statTotal = document.querySelector('#stat-total .stat-value');
  const statApplied = document.querySelector('#stat-applied .stat-value');
  const statPending = document.querySelector('#stat-pending .stat-value');
  const statSkills = document.querySelector('#stat-skills .stat-value');
  
  // Tab 1 Elements
  const companiesList = document.getElementById('companies-list');
  const searchInput = document.getElementById('search-companies-input');
  const filterSector = document.getElementById('filter-sector');
  const filterPriority = document.getElementById('filter-priority');
  const filterStatus = document.getElementById('filter-status');

  // Career Advisor Elements
  const advisorToggle = document.getElementById('advisor-toggle');
  const advisorBody = document.getElementById('advisor-body');
  const advisorArrow = document.getElementById('advisor-arrow');
  const profileTrack = document.getElementById('profile-track');
  const profileLocation = document.getElementById('profile-location');
  const profileProject = document.getElementById('profile-project');
  const advisorRecommendation = document.getElementById('advisor-recommendation');

  // Tab 2 Elements
  const skillsList = document.getElementById('skills-list');
  const radialProgressCircle = document.getElementById('radial-progress-circle');
  const radialProgressText = document.getElementById('radial-progress-text');

  // Tab 3 Elements
  const phase2TableBody = document.querySelector('#phase2-table tbody');

  // Tab 4 Elements
  const keywordsList = document.getElementById('keywords-list');

  // Modal Elements
  const editModal = document.getElementById('edit-modal');
  const modalCompanyName = document.getElementById('modal-company-name');
  const editCompanyId = document.getElementById('edit-company-id');
  const editStatus = document.getElementById('edit-status');
  const editDate = document.getElementById('edit-date');
  const editNotes = document.getElementById('edit-notes');
  const editForm = document.getElementById('edit-form');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // Footer Actions
  const btnExportData = document.getElementById('btn-export-data');
  const btnResetData = document.getElementById('btn-reset-data');

  // Initialize App
  async function init() {
    setupTabNavigation();
    setupModalEvents();
    setupFilterEvents();
    setupFooterActions();
    setupAdvisorEvents();
    
    await loadData();
    loadProfile();
    updateStats();
    renderAll();
  }

  function saveCompaniesToStorage() {
    localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(state.companies));
  }

  // ==========================================================================
  // CSV PARSER HELPER
  // ==========================================================================
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return [];
    
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(val => {
        if (val.startsWith('"') && val.endsWith('"')) {
          return val.slice(1, -1).trim();
        }
        return val;
      });
    };

    const headers = parseCSVLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] !== undefined ? values[index] : '';
      });
      data.push(obj);
    }
    return data;
  }

  // ==========================================================================
  // DATA LOADING & PERSISTENCE (LIVE GOOGLE SHEETS MERGE)
  // ==========================================================================
  async function loadData() {
    try {
      const cachedCompanies = localStorage.getItem(STORAGE_KEY_COMPANIES);
      let localList = cachedCompanies ? JSON.parse(cachedCompanies) : [];
      
      const cachedSkills = localStorage.getItem(STORAGE_KEY_SKILLS);
      let localSkills = cachedSkills ? JSON.parse(cachedSkills) : [];

      try {
        // 1. Fetch Companies live from Google Sheet
        const resCompanies = await fetch('https://docs.google.com/spreadsheets/d/1e9DvXcHgIBrkQoraDgwwvE8oISwLk-vuc8f7AFLfpZE/export?format=csv&gid=958186770');
        const csvCompanies = await resCompanies.text();
        const sheetList = parseCSV(csvCompanies);

        // Merge Sheet updates with local edits
        sheetList.forEach(sheetCompany => {
          const localCompany = localList.find(c => c['บริษัท'] === sheetCompany['บริษัท']);
          if (localCompany) {
            // Keep status/notes edits, but sync other spreadsheet fields
            localCompany['กลุ่มสาย'] = sheetCompany['กลุ่มสาย'];
            localCompany['อุตสาหกรรม'] = sheetCompany['อุตสาหกรรม'];
            localCompany['ที่ตั้งหลัก'] = sheetCompany['ที่ตั้งหลัก'];
            localCompany['ทำไมเข้าเกณฑ์ / จุดเด่น'] = sheetCompany['ทำไมเข้าเกณฑ์ / จุดเด่น'];
            localCompany['ตำแหน่งที่ควรเสิร์ช'] = sheetCompany['ตำแหน่งที่ควรเสิร์ช'];
            localCompany['เงินเดือนจบใหม่ (ประมาณ, บาท/เดือน)'] = sheetCompany['เงินเดือนจบใหม่ (ประมาณ, บาท/เดือน)'];
            localCompany['อัตราเติบโต/แนวโน้ม'] = sheetCompany['อัตราเติบโต/แนวโน้ม'];
            localCompany['Priority'] = sheetCompany['Priority'];
          } else {
            // Brand new company added in the sheet
            sheetCompany['Status'] = 'ยังไม่สมัคร';
            sheetCompany['วันที่สมัคร'] = '';
            sheetCompany['โน้ตของตัวเอง'] = '';
            localList.push(sheetCompany);
          }
        });

        // Filter out companies deleted from the spreadsheet
        const sheetCompanyNames = sheetList.map(s => s['บริษัท']);
        localList = localList.filter(c => sheetCompanyNames.includes(c['บริษัท']));
        
        state.companies = localList;
        saveCompaniesToStorage();

        // 2. Fetch Skills live from Google Sheet
        const resSkills = await fetch('https://docs.google.com/spreadsheets/d/1e9DvXcHgIBrkQoraDgwwvE8oISwLk-vuc8f7AFLfpZE/export?format=csv&gid=901361552');
        const csvSkills = await resSkills.text();
        const sheetSkills = parseCSV(csvSkills);

        // Merge Skills
        sheetSkills.forEach(sheetSkill => {
          const localSkill = localSkills.find(s => s['ทักษะ'] === sheetSkill['ทักษะ']);
          if (localSkill) {
            localSkill['ทำไมสำคัญ'] = sheetSkill['ทำไมสำคัญ'];
            localSkill['แหล่งเรียน (เริ่มต้น)'] = sheetSkill['แหล่งเรียน (เริ่มต้น)'];
            localSkill['เป้า Deadline'] = sheetSkill['เป้า Deadline'];
          } else {
            // New skill added in the sheet
            sheetSkill['เสร็จแล้ว?'] = '🔄 กำลังทำ';
            localSkills.push(sheetSkill);
          }
        });

        // Filter out deleted skills
        const sheetSkillNames = sheetSkills.map(s => s['ทักษะ']);
        localSkills = localSkills.filter(s => sheetSkillNames.includes(s['ทักษะ']));

        state.skills = localSkills;
        saveSkillsToStorage();

        // 3. Fetch Phase 2 live from Google Sheet (Static, override always)
        const resPhase2 = await fetch('https://docs.google.com/spreadsheets/d/1e9DvXcHgIBrkQoraDgwwvE8oISwLk-vuc8f7AFLfpZE/export?format=csv&gid=1690908859');
        const csvPhase2 = await resPhase2.text();
        state.phase2 = parseCSV(csvPhase2);

        // 4. Fetch Keywords live from Google Sheet (Static, override always)
        const resKeywords = await fetch('https://docs.google.com/spreadsheets/d/1e9DvXcHgIBrkQoraDgwwvE8oISwLk-vuc8f7AFLfpZE/export?format=csv&gid=1167331677');
        const csvKeywords = await resKeywords.text();
        state.keywords = parseCSV(csvKeywords);

        console.log('Successfully synced live data from Google Sheets!');

      } catch (netError) {
        console.warn('Network offline or error fetching live Sheets, falling back to local files:', netError);
        
        // Offline fallbacks
        state.companies = localList.length > 0 ? localList : await fetch('./data/companies.json').then(r => r.json());
        state.skills = localSkills.length > 0 ? localSkills : await fetch('./data/skills.json').then(r => r.json());
        state.phase2 = await fetch('./data/phase2.json').then(r => r.json());
        state.keywords = await fetch('./data/keywords.json').then(r => r.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล', '#ef4444');
    }
  }

  // ==========================================================================
  // CAREER PROFILE ADVISOR LOGIC
  // ==========================================================================
  function saveProfileToStorage() {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }

  function loadProfile() {
    const cachedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (cachedProfile) {
      profile = JSON.parse(cachedProfile);
    }
    
    // Bind form selections
    profileTrack.value = profile.track || 'hybrid';
    profileLocation.value = profile.location || 'flexible';
    profileProject.value = profile.project || 'sim_python';
    
    updateAdvisorRecommendations();
  }

  function setupAdvisorEvents() {
    // Collapsible toggle
    advisorToggle.addEventListener('click', () => {
      advisorBody.classList.toggle('collapsed');
      advisorToggle.classList.toggle('active');
    });

    // Dropdown change listeners
    profileTrack.addEventListener('change', () => {
      profile.track = profileTrack.value;
      saveProfileToStorage();
      updateAdvisorRecommendations();
      renderCompanies();
      renderSkills(); // Re-render skills to highlight relevant ones
    });

    profileLocation.addEventListener('change', () => {
      profile.location = profileLocation.value;
      saveProfileToStorage();
      updateAdvisorRecommendations();
      renderCompanies();
    });

    profileProject.addEventListener('change', () => {
      profile.project = profileProject.value;
      saveProfileToStorage();
      updateAdvisorRecommendations();
    });
  }

  function updateAdvisorRecommendations() {
    if (!advisorRecommendation) return;

    let trackTips = '';
    let projectTips = '';
    let matchedComps = [];

    // 1. Analyze Selected Career Track
    if (profile.track === 'hybrid') {
      trackTips = '💡 <strong>แนวทางสายงาน Hybrid (CAE + Data):</strong> เน้นการนำการจำลองทางฟิสิกส์มาช่วยลดเวลารวมถึงต้นทุนในการสุ่มทดลองจริง และเขียนสคริปต์คอมพิวเตอร์มาช่วยคัดเลือกผลลัพธ์แบบอัตโนมัติ';
      matchedComps = state.companies.filter(c => 
        c['กลุ่มสาย'].includes('CAE') || c['กลุ่มสาย'].includes('Data') || c['กลุ่มสาย'].includes('Software')
      );
    } else if (profile.track === 'cae') {
      trackTips = '💡 <strong>แนวทางสายงาน Core CAE:</strong> เน้นความแข็งแกร่งด้านวิศวกรรมกลศาสตร์เชิงลึก ความเข้าใจในความเครียด/ความล้าวัสดุ และระเบียบวิธีไฟไนต์เอลิเมนต์เชิงทฤษฎี';
      matchedComps = state.companies.filter(c => 
        c['กลุ่มสาย'].includes('CAE') || c['กลุ่มสาย'].includes('Software')
      );
    } else if (profile.track === 'data') {
      trackTips = '💡 <strong>แนวทางสายงาน Data/Smart Factory:</strong> เน้นทักษะการดึงข้อมูลจาก SQL database ในไลน์ผลิต คลีนข้อมูลด้วย Python/Pandas และจัดแสดงผลลัพธ์ผ่าน BI Dashboard';
      matchedComps = state.companies.filter(c => 
        c['กลุ่มสาย'].includes('Data')
      );
    } else if (profile.track === 'pdm') {
      trackTips = '💡 <strong>แนวทางสายงาน Predictive Maintenance:</strong> เน้นความรู้การตรวจจับสัญญาณการสั่นสะเทือน (Vibration Analysis) อายุตลับลูกปืน และการบำรุงรักษาเชิงคาดการณ์';
      matchedComps = state.companies.filter(c => 
        c['กลุ่มสาย'].includes('Predictive Maintenance')
      );
    } else if (profile.track === 'automation') {
      trackTips = '💡 <strong>แนวทางสายงาน Automation:</strong> เจาะจงด้านการเขียนโค้ดควบคุมระบบกลไกและการใช้ MATLAB/Simulink ออกแบบการทำงานของหุ่นยนต์อุตสาหกรรม';
      matchedComps = state.companies.filter(c => 
        c['กลุ่มสาย'].includes('Automation')
      );
    }

    // 2. Analyze Selected Senior Project
    if (profile.project === 'sim_python') {
      projectTips = '🚀 <strong>โปรเจกต์ของคุณ:</strong> แนะนำให้ใช้ Python (เช่น PyAnsys หรือ Abaqus Python Scripting) ในการตั้งค่ารันจำลองวนซ้ำ (Parametric Sweep) และใช้ SQL จัดเก็บข้อมูลเพื่อเชื่อมโยงกับ Power BI แดชบอร์ด';
    } else if (profile.project === 'sim_only') {
      projectTips = '🚀 <strong>โปรเจกต์ของคุณ:</strong> มุ่งเน้นการสอบเทียบผลลัพธ์ (Calibration) ระหว่างผลจำลองจากโมเดล CAE และค่าจากการทดลองจริงในห้องแล็บเพื่อรับประกันความถูกต้องแม่นยำสูงสุด';
    } else if (profile.project === 'hybrid_ml') {
      projectTips = '🚀 <strong>โปรเจกต์ของคุณ:</strong> สร้างโมเดลทำนายค่าวิศวกรรมอย่างรวดเร็ว (Surrogate Model) โดยสุ่มรัน Simulation หลายร้อยรอบเพื่อนำผลลัพธ์ไปสร้างชุดข้อมูลสำหรับสอน Machine Learning';
    } else {
      projectTips = '🚀 <strong>โปรเจกต์ของคุณ:</strong> แนะนำให้พูดคุยกับอาจารย์ที่ปรึกษาเพื่อตั้งขอบเขตจำลองพฤติกรรมกลไกหรือโครงสร้าง เพื่อเก็บแฟ้มสะสมงาน (Portfolio) ชั้นเยี่ยมสำหรับสมัครงาน R&D';
    }

    // 3. Filter Matches by Location
    if (profile.location === 'south') {
      const southernNames = state.phase2.map(p => p['บริษัท']);
      matchedComps = matchedComps.filter(c => 
        c['ที่ตั้งหลัก'].includes('ใต้') || c['ที่ตั้งหลัก'].includes('สงขลา') || c['ที่ตั้งหลัก'].includes('หาดใหญ่') ||
        c['บริษัท'].includes('SCG') || c['บริษัท'].includes('PTT') || southernNames.includes(c['บริษัท'])
      );
    } else if (profile.location === 'bkk') {
      matchedComps = matchedComps.filter(c => 
        c['ที่ตั้งหลัก'].includes('กรุงเทพ') || c['ที่ตั้งหลัก'].includes('สมุทรปราการ') || c['ที่ตั้งหลัก'].includes('ปทุมธานี') || c['ที่ตั้งหลัก'].includes('สมุทรสาคร')
      );
    } else if (profile.location === 'eastern') {
      matchedComps = matchedComps.filter(c => 
        c['ที่ตั้งหลัก'].includes('ชลบุรี') || c['ที่ตั้งหลัก'].includes('ระยอง')
      );
    }

    // Take top 5
    const topComps = matchedComps.slice(0, 5);
    const compTags = topComps.length > 0 
      ? topComps.map(c => `<span class="rec-company-tag">${c['บริษัท']}</span>`).join('') 
      : (profile.location === 'south' 
          ? `<span class="rec-company-tag">ม.อ. / Southern Science Park</span><span class="rec-company-tag">ศรีตรังแอโกร</span><span class="rec-company-tag">EGAT (จะนะ)</span>`
          : `<span class="rec-company-tag">ไม่พบบริษัทแนะนำในทำเลนี้</span>`);

    // Update Box HTML
    advisorRecommendation.innerHTML = `
      <div class="recommendation-title">
        <span class="material-symbols-rounded">auto_awesome</span>
        <span>คำแนะนำโปรไฟล์และบริษัทเป้าหมายของคุณ</span>
      </div>
      <div class="recommendation-tips">
        <p style="margin-bottom: 8px;">${trackTips}</p>
        <p>${projectTips}</p>
      </div>
      <div style="margin-top: 10px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 6px;">บริษัทแนะนำที่ตรงกับโปรไฟล์คุณ:</span>
        <div class="recommendation-companies-list">${compTags}</div>
      </div>
    `;
  }

  function isProfileMatch(c) {
    // Check Track Match
    let trackMatch = false;
    if (profile.track === 'hybrid') {
      trackMatch = c['กลุ่มสาย'].includes('CAE') || c['กลุ่มสาย'].includes('Data') || c['กลุ่มสาย'].includes('Software');
    } else if (profile.track === 'cae') {
      trackMatch = c['กลุ่มสาย'].includes('CAE') || c['กลุ่มสาย'].includes('Software');
    } else if (profile.track === 'data') {
      trackMatch = c['กลุ่มสาย'].includes('Data');
    } else if (profile.track === 'pdm') {
      trackMatch = c['กลุ่มสาย'].includes('Predictive Maintenance') || c['กลุ่มสาย'].includes('Reliability');
    } else if (profile.track === 'automation') {
      trackMatch = c['กลุ่มสาย'].includes('Automation') || c['กลุ่มสาย'].includes('Mechatronics');
    }

    // Check Location Match
    let locMatch = false;
    if (profile.location === 'flexible') {
      locMatch = true;
    } else if (profile.location === 'south') {
      const southernNames = state.phase2.map(p => p['บริษัท']);
      locMatch = c['ที่ตั้งหลัก'].includes('ใต้') || c['ที่ตั้งหลัก'].includes('สงขลา') || c['ที่ตั้งหลัก'].includes('หาดใหญ่') ||
                 c['บริษัท'].includes('SCG') || c['บริษัท'].includes('PTT') || southernNames.includes(c['บริษัท']);
    } else if (profile.location === 'bkk') {
      locMatch = c['ที่ตั้งหลัก'].includes('กรุงเทพ') || c['ที่ตั้งหลัก'].includes('สมุทรปราการ') || 
                 c['ที่ตั้งหลัก'].includes('ปทุมธานี') || c['ที่ตั้งหลัก'].includes('สมุทรสาคร');
    } else if (profile.location === 'eastern') {
      locMatch = c['ที่ตั้งหลัก'].includes('ชลบุรี') || c['ที่ตั้งหลัก'].includes('ระยอง');
    }

    return trackMatch && locMatch;
  }


  // ==========================================================================
  // TAB NAVIGATION
  // ==========================================================================
  function setupTabNavigation() {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');
        
        // Update active class on buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Toggle tab panels
        tabPanels.forEach(panel => {
          if (panel.id === targetTabId) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });
  }

  // ==========================================================================
  // STATISTICS SUMMARY
  // ==========================================================================
  function updateStats() {
    // Total
    const total = state.companies.length;
    statTotal.textContent = total;

    // Applied vs Pending
    // "Applied" counts: สมัครแล้ว, กำลังดำเนินการ, ได้ Offer
    const appliedCount = state.companies.filter(c => 
      ['สมัครแล้ว', 'กำลังดำเนินการ', 'ได้ Offer'].includes(c['Status'])
    ).length;
    
    const pendingCount = state.companies.filter(c => 
      c['Status'] === 'ยังไม่สมัคร' || !c['Status']
    ).length;

    statApplied.textContent = appliedCount;
    statPending.textContent = pendingCount;

    // Skills Completion
    const totalSkills = state.skills.length;
    const completedSkills = state.skills.filter(s => s['เสร็จแล้ว?'] === '✅').length;
    const skillsPercent = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
    
    statSkills.textContent = `${skillsPercent}%`;
    
    // Update skills radial progress in Tab 2
    updateRadialProgress(skillsPercent);
  }

  function updateRadialProgress(percent) {
    if (!radialProgressCircle) return;
    
    // Circle circumference is 2 * pi * r (2 * 3.14159 * 40 = ~251.2)
    const circumference = 251.2;
    const offset = circumference - (percent / 100) * circumference;
    radialProgressCircle.style.strokeDashoffset = offset;
    radialProgressText.textContent = `${percent}%`;
  }

  // ==========================================================================
  // RENDER VIEWS
  // ==========================================================================
  function renderAll() {
    renderCompanies();
    renderSkills();
    renderPhase2();
    renderKeywords();
  }

  // Render TAB 1: COMPANIES
  function renderCompanies() {
    companiesList.innerHTML = '';
    
    const query = searchInput.value.toLowerCase().trim();
    const sector = filterSector.value;
    const priority = filterPriority.value;
    const status = filterStatus.value;

    const filtered = state.companies.filter(c => {
      // 1. Search Query Match
      const nameMatch = c['บริษัท'] ? c['บริษัท'].toLowerCase().includes(query) : false;
      const industryMatch = c['อุตสาหกรรม'] ? c['อุตสาหกรรม'].toLowerCase().includes(query) : false;
      const jobMatch = c['ตำแหน่งที่ควรเสิร์ช'] ? c['ตำแหน่งที่ควรเสิร์ช'].toLowerCase().includes(query) : false;
      const noteMatch = c['โน้ตของตัวเอง'] ? c['โน้ตของตัวเอง'].toLowerCase().includes(query) : false;
      const matchesSearch = !query || nameMatch || industryMatch || jobMatch || noteMatch;

      // 2. Sector Filter
      const matchesSector = sector === 'all' || (c['กลุ่มสาย'] && c['กลุ่มสาย'].includes(sector));

      // 3. Priority Filter
      const matchesPriority = priority === 'all' || c['Priority'] == priority;

      // 4. Status Filter
      const matchesStatus = status === 'all' || c['Status'] === status;

      return matchesSearch && matchesSector && matchesPriority && matchesStatus;
    });

    if (filtered.length === 0) {
      companiesList.innerHTML = `
        <div class="no-results-card" style="grid-column: 1/-1; text-align: center; padding: 40px; background-color: var(--bg-card); border-radius: var(--border-radius-lg); border: 1px solid var(--border-light);">
          <span class="material-symbols-rounded" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;">search_off</span>
          <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">ไม่พบรายชื่อบริษัทที่ตรงตามเงื่อนไข</h4>
          <p style="font-size: 13px; color: var(--text-secondary);">ลองค้นหาด้วยคำอื่นหรือเลือกฟิลเตอร์ใหม่</p>
        </div>
      `;
      return;
    }

    filtered.forEach((c, index) => {
      const isMatched = isProfileMatch(c);
      const card = document.createElement('div');
      card.className = 'company-card' + (isMatched ? ' matched-highlight' : '');
      
      // Determine priority CSS class
      let priorityClass = 'p3';
      if (c['Priority'] == '1') priorityClass = 'p1';
      if (c['Priority'] == '2') priorityClass = 'p2';

      // Determine status badge CSS class
      let statusClass = 'yet';
      if (c['Status'] === 'สมัครแล้ว') statusClass = 'applied';
      if (c['Status'] === 'กำลังดำเนินการ') statusClass = 'process';
      if (c['Status'] === 'ได้ Offer') statusClass = 'offer';
      if (c['Status'] === 'ปฏิเสธ') statusClass = 'rejected';

      const salaryText = c['เงินเดือนจบใหม่ (ประมาณ, บาท/เดือน)'] || 'ไม่ระบุ';
      const notesText = c['โน้ตของตัวเอง'] || 'ไม่มีบันทึกเพิ่มเติม';
      const applyDate = c['วันที่สมัคร'] ? `<div class="detail-item"><span class="material-symbols-rounded icon">calendar_month</span><span class="label">วันที่สมัคร:</span><span class="value">${c['วันที่สมัคร']}</span></div>` : '';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            <h4 style="display: flex; align-items: center; gap: 8px;">${c['บริษัท']} ${isMatched ? '<span class="matched-tag">⭐ แนะนำ</span>' : ''}</h4>
            <span class="industry-label">${c['อุตสาหกรรม']}</span>
          </div>
          <span class="priority-badge ${priorityClass}">Priority ${c['Priority']}</span>
        </div>

        <div class="card-details">
          <div class="detail-item">
            <span class="material-symbols-rounded icon">engineering</span>
            <span class="label">สายงาน:</span>
            <span class="value">${c['กลุ่มสาย']}</span>
          </div>
          <div class="detail-item">
            <span class="material-symbols-rounded icon">search</span>
            <span class="label">คำค้นหา:</span>
            <span class="value">${c['ตำแหน่งที่ควรเสิร์ช']}</span>
          </div>
          <div class="detail-item">
            <span class="material-symbols-rounded icon">payments</span>
            <span class="label">เงินเดือนคาดหวัง:</span>
            <span class="value">${salaryText} บาท</span>
          </div>
          <div class="detail-item">
            <span class="material-symbols-rounded icon">location_on</span>
            <span class="label">ที่ตั้ง:</span>
            <span class="value">${c['ที่ตั้งหลัก']}</span>
          </div>
          ${applyDate}
        </div>

        <div class="card-notes">${notesText}</div>

        <div class="card-footer-row">
          <span class="status-chip ${statusClass}">${c['Status'] || 'ยังไม่สมัคร'}</span>
          <button class="edit-status-btn" data-company-name="${c['บริษัท']}" data-index="${state.companies.indexOf(c)}" aria-label="Edit Status">
            <span class="material-symbols-rounded">edit_note</span>
          </button>
        </div>
      `;

      companiesList.appendChild(card);
    });

    // Add edit button listeners
    document.querySelectorAll('.edit-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = btn.getAttribute('data-index');
        openEditModal(index);
      });
    });
  }

  // Render TAB 2: SKILLS CHECKLIST
  function renderSkills() {
    skillsList.innerHTML = '';
    
    state.skills.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      const isChecked = s['เสร็จแล้ว?'] === '✅';

      // Determine if recommended for profile
      let isRecommendedSkill = false;
      if (profile.track === 'hybrid') {
        isRecommendedSkill = s['ทักษะ'].includes('Python') || s['ทักษะ'].includes('ANSYS') || s['ทักษะ'].includes('SQL') || s['ทักษะ'].includes('Power BI');
      } else if (profile.track === 'cae') {
        isRecommendedSkill = s['ทักษะ'].includes('ANSYS') || s['ทักษะ'].includes('SolidWorks') || s['ทักษะ'].includes('CFD') || s['ทักษะ'].includes('Abaqus');
      } else if (profile.track === 'data') {
        isRecommendedSkill = s['ทักษะ'].includes('Python') || s['ทักษะ'].includes('SQL') || s['ทักษะ'].includes('Power BI');
      } else if (profile.track === 'pdm') {
        isRecommendedSkill = s['ทักษะ'].includes('Python') || s['ทักษะ'].includes('SQL') || s['ทักษะ'].includes('ANSYS');
      } else if (profile.track === 'automation') {
        isRecommendedSkill = s['ทักษะ'].includes('MATLAB');
      }

      const skillRecommendTag = isRecommendedSkill ? `<span class="matched-tag" style="margin-left: 8px; font-size: 10px; padding: 2px 6px; vertical-align: middle;">⭐ แนะนำพิเศษ</span>` : '';

      card.innerHTML = `
        <div class="skill-main-info">
          <div class="skill-checkbox-wrapper">
            <input type="checkbox" id="skill-chk-${idx}" data-idx="${idx}" ${isChecked ? 'checked' : ''}>
            <label class="custom-checkbox" for="skill-chk-${idx}"></label>
          </div>
          <div class="skill-text">
            <h5 style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">${s['ทักษะ']} ${skillRecommendTag}</h5>
            <p class="why-important">${s['ทำไมสำคัญ']}</p>
            <p class="resource-info">
              <span class="material-symbols-rounded">menu_book</span>
              <span>แหล่งเรียนรู้: ${s['แหล่งเรียน (เริ่มต้น)']}</span>
            </p>
          </div>
        </div>
        <div class="skill-meta">
          <span class="deadline-badge">เป้าหมาย: ${s['เป้า Deadline']}</span>
        </div>
      `;

      skillsList.appendChild(card);
    });

    // Add checkbox toggle listeners
    document.querySelectorAll('.skill-card input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = chk.getAttribute('data-idx');
        state.skills[idx]['เสร็จแล้ว?'] = chk.checked ? '✅' : '🔄 กำลังทำ';
        saveSkillsToStorage();
        updateStats();
      });
    });
  }

  // Render TAB 3: PHASE 2 SOUTHERN PLAN
  function renderPhase2() {
    phase2TableBody.innerHTML = '';
    
    state.phase2.forEach(p => {
      const tr = document.createElement('tr');
      
      let matchClass = 'no';
      if (p['เข้าเกณฑ์ไหม'] === 'ตรงสายสุดในพื้นที่') matchClass = 'yes';
      if (p['เข้าเกณฑ์ไหม'].includes('พอมีงาน')) matchClass = 'partial';

      tr.innerHTML = `
        <td style="font-weight: 600;">${p['บริษัท']}</td>
        <td>${p['อุตสาหกรรม']}</td>
        <td>${p['ทำเล']}</td>
        <td>${p['ลักษณะงานที่เปิดบ่อย']}</td>
        <td><span class="table-match-badge ${matchClass}">${p['เข้าเกณฑ์ไหม']}</span></td>
        <td style="color: var(--text-secondary); font-size: 13px;">${p['โน้ต'] || '-'}</td>
      `;
      phase2TableBody.appendChild(tr);
    });
  }

  // Render TAB 4: JOB KEYWORDS HELPER
  function renderKeywords() {
    keywordsList.innerHTML = '';
    
    state.keywords.forEach(k => {
      const card = document.createElement('div');
      card.className = 'keyword-card';
      
      // Parse multi-keywords separated by commas
      const engKeywords = k['คำค้นหา (Eng)'].split(',').map(s => s.trim());
      const thKeywords = k['คำค้นหา (ไทย)'].split(',').map(s => s.trim());

      let engBadges = engKeywords.map(kw => `<span class="keyword-badge" data-copy="${kw}">${kw} <span class="material-symbols-rounded copy-icon">content_copy</span></span>`).join('');
      let thBadges = thKeywords.map(kw => `<span class="keyword-badge" data-copy="${kw}">${kw} <span class="material-symbols-rounded copy-icon">content_copy</span></span>`).join('');

      card.innerHTML = `
        <h4>${k['กลุ่ม']}</h4>
        
        <div class="keyword-item">
          <span class="label">ค้นหาภาษาอังกฤษ</span>
          <div class="keyword-badge-row">${engBadges}</div>
        </div>

        <div class="keyword-item">
          <span class="label">ค้นหาภาษาไทย</span>
          <div class="keyword-badge-row">${thBadges}</div>
        </div>

        <div class="keyword-item">
          <span class="label">แพลตฟอร์มแนะนำ</span>
          <span class="keyword-platform">${k['ใช้หาบนแพลตฟอร์มไหนดี']}</span>
        </div>
      `;
      keywordsList.appendChild(card);
    });

    // Add Copy Keyword listeners
    document.querySelectorAll('.keyword-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const textToCopy = badge.getAttribute('data-copy');
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast(`📋 คัดลอก "${textToCopy}" เรียบร้อย!`);
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      });
    });
  }

  // ==========================================================================
  // INTERACTIVE FILTERS
  // ==========================================================================
  function setupFilterEvents() {
    searchInput.addEventListener('input', renderCompanies);
    filterSector.addEventListener('change', renderCompanies);
    filterPriority.addEventListener('change', renderCompanies);
    filterStatus.addEventListener('change', renderCompanies);
  }

  // ==========================================================================
  // STATUS EDIT MODAL DIALOG
  // ==========================================================================
  function setupModalEvents() {
    btnCloseModal.addEventListener('click', closeModal);
    
    // Close on overlay click
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });

    // Save changes
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(editCompanyId.value);
      
      // Update state
      state.companies[idx]['Status'] = editStatus.value;
      state.companies[idx]['วันที่สมัคร'] = editDate.value;
      state.companies[idx]['โน้ตของตัวเอง'] = editNotes.value;
      
      saveCompaniesToStorage();
      updateStats();
      renderCompanies();
      closeModal();
      showToast('💾 บันทึกข้อมูลบริษัทเรียบร้อย!');
    });
  }

  function openEditModal(idx) {
    const c = state.companies[idx];
    
    modalCompanyName.textContent = c['บริษัท'];
    editCompanyId.value = idx;
    editStatus.value = c['Status'] || 'ยังไม่สมัคร';
    editDate.value = c['วันที่สมัคร'] || '';
    editNotes.value = c['โน้ตของตัวเอง'] || '';
    
    editModal.classList.add('active');
  }

  function closeModal() {
    editModal.classList.remove('active');
  }

  // ==========================================================================
  // TOAST ALERTS
  // ==========================================================================
  function showToast(message, bgColor = 'var(--primary)') {
    // Remove existing toast if visible
    const existingToast = document.querySelector('.toast-notif');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notif';
    toast.style.backgroundColor = bgColor;
    toast.innerHTML = `
      <span class="material-symbols-rounded">info</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================================================
  // FOOTER BACKUP & RESET ACTIONS
  // ==========================================================================
  function setupFooterActions() {
    // Export Data (JSON backup)
    btnExportData.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "findjob_dashboard_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('📥 ดาวน์โหลดไฟล์สำรองข้อมูลเสร็จสิ้น!');
    });

    // Reset Data (Revert to initial spreadsheet state)
    btnResetData.addEventListener('click', () => {
      if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตามตารางสเปรดชีตใช่หรือไม่? ข้อมูลบันทึกและวันสมัครของคุณจะหายไป.')) {
        localStorage.removeItem(STORAGE_KEY_COMPANIES);
        localStorage.removeItem(STORAGE_KEY_SKILLS);
        localStorage.removeItem(STORAGE_KEY_PROFILE);
        showToast('🔄 กำลังรีเซ็ตข้อมูล...', '#f59e0b');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }

  // Run the app!
  init();

});
