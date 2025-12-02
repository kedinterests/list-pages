/**
 * Google Apps Script for Testimonials
 * Returns testimonials data as JSON from Google Sheets
 */

function doGet(e) {
  try {
    // Get sheet ID from query parameter
    const sheetId = e.parameter.sheetId;
    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Missing sheetId parameter'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Open the spreadsheet
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getActiveSheet();
    
    // Get all data
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        testimonials: [],
        updated_at: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // First row is headers - convert to lowercase for consistency
    const headers = data[0].map(h => String(h || '').toLowerCase().trim());
    
    // Find column indices (handle variations)
    const testimonialCol = findColumnIndex(headers, ['testimonial']);
    const nameCol = findColumnIndex(headers, ['name']);
    const dateCol = findColumnIndex(headers, ['date']);
    const showHideCol = findColumnIndex(headers, ['show/hide', 'show_hide', 'show-hide']);

    if (testimonialCol === -1 || nameCol === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Missing required columns: testimonial and name'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Build testimonials array
    const testimonials = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[testimonialCol] && !row[nameCol]) {
        continue;
      }

      const testimonial = {
        testimonial: String(row[testimonialCol] || '').trim(),
        name: String(row[nameCol] || '').trim(),
        date: dateCol >= 0 ? String(row[dateCol] || '').trim() : '',
        'show/hide': showHideCol >= 0 ? String(row[showHideCol] || '').trim() : 'Show'
      };

      testimonials.push(testimonial);
    }

    // Return JSON response
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      testimonials: testimonials,
      updated_at: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper function to find column index by name (case-insensitive)
 */
function findColumnIndex(headers, possibleNames) {
  const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().trim();
    const index = lowerHeaders.indexOf(lowerName);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

