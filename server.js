const express = require('express');
const path = require('path');
const { connectToDB, getDBConnection } = require('./db');// okay ra ni, bisan dili nato gamiton karon
const bodyParser = require('body-parser');
const session = require('express-session');
const router = express.Router();
const sql = require("mssql/msnodesqlv8");
const multer = require('multer');
const fs = require('fs');




const app = express();
const port = 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));






// Middlewares
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret-key', // himo og secret key
    resave: false,
    saveUninitialized: true, // Changed to false in production
    cookie: {
        maxAge: 30 * 60 * 1000, // 30 minutes (in milliseconds)
        secure: false, // Enable if using HTTPS. // delete in production
    }
}));

// Dev-only auto-login (remove in production)
// if (process.env.NODE_ENV !== 'production') {
//     app.use((req, res, next) => {
//       if (!req.session.user) {
//         req.session.user = { id: 1, name: "DEV USER" }; // Auto-login
//       }
//       next();
//     });
//   }

app.use((req, res, next) => {
    if (req.session.user) {
        req.session.touch(); // Reset maxAge timer
        // OR manually reset cookie:
        // req.session.cookie.expires = new Date(Date.now() + 30 * 60 * 1000);
    }
    next();
});
app.use((req, res, next) => {
    if (req.session.user && req.session.cookie.expires < new Date()) {
        req.session.destroy(); // Clear expired session
        return res.redirect('/'); // Redirect to login
    }
    next();
});
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
}

//file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    // Generate 7-digit random number
    const shortId = Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0');
    
    // Get file extension from original name
    const ext = path.extname(file.originalname);
    
    cb(null, `${shortId}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});





// ROUTES

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Logout failed');
        }
        res.redirect('/'); // Redirect to login page after logout
    });
});

// Serve public folder for static files
app.use(express.static('public'));

// Serve static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// Serve login.html when accessing '/login'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Serve registration.html
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

// Serve addBorrower.html
app.get('/add-borrower', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'addBorrower.html'));
});

// Serve baorrowers.html
app.get('/borrowers', checkAuth, (req, res) => {
    const user_id = req.session.user.user_id;
    res.render('borrowers', { userId: user_id  });
});

// Serve addLoan.html
app.get('/add-loan', checkAuth, (req, res) => {
    const user_id = req.session.user.user_id;
    res.render('addLoan', { userId: user_id });
});

// Serve recordPayment.ejs
app.get('/record-payment', checkAuth, (req, res) => {
    const user_id = req.session.user.user_id;
    res.render('recordPayment', { userId: user_id });
});



// Serve loans.ejs
app.get('/loans', checkAuth, (req, res) => {
    const loanId = req.query.loan_id;
    const user_id = req.session.user.user_id;
    res.render('loans', { loanId:loanId, userId: user_id });
});

// Serve payments.ejs
app.get('/payments', checkAuth, (req, res) => {
    const user_id = req.session.user.user_id;
    res.render('payments', { userId: user_id });
});


app.get('/dashboard', checkAuth, (req, res) => {
    const fullName = req.session.user.first_name;
    const user_id = req.session.user.user_id;
    const firstName = fullName.split(' ')[0];
    res.render('dashboard', { name: firstName , userId: user_id });
});

app.get('/uploads/:filename', (req, res, next) => {
    const file = path.join(__dirname, 'public/uploads', path.basename(req.params.filename));
    if (fs.existsSync(file)) {
        res.sendFile(file);
    } else {
        res.status(404).send('File not found');
    }
});




// POST Register
app.post('/register', async (req, res) => {
    const { firstname, lastname, email, password, confirmPassword } = req.body;

   

    try {
        const pool = await connectToDB();

        // Check if email already exists
        const checkEmail = await pool.request()
            .input('email', email)
            .query(`SELECT * FROM users WHERE email = @email`);

        if (checkEmail.recordset.length > 0) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Insert new user
        await pool.request()
            .input('firstname', firstname)
            .input('lastname', lastname)
            .input('email', email)
            .input('password', password)
            .query(`
                INSERT INTO users (first_name, last_name, email, password)
                VALUES (@firstname, @lastname, @email, @password)
            `);

        // Fetch inserted user
        const result = await pool.request()
            .input('email', email)
            .input('password', password)
            .query(`SELECT * FROM users WHERE email = @email AND password = @password`);

        if (result.recordset.length > 0) {
            req.session.user = result.recordset[0];
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: 'Registration successful but could not log in' });
        }

    } catch (err) {
        console.error(err); 
        res.status(500).json({ error: 'Registration failed' });
    }
});



app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('email', email)
            .input('password', password)
            .query(`
                SELECT * FROM users WHERE email = @email AND password = @password
            `);

        if (result.recordset.length > 0) {
            req.session.user = result.recordset[0];
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Fetch Data to dashboard table

app.get('/api/payments/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    console.log("Received userId:", userId);
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {   
        const pool = await connectToDB();

        const query = `
            WITH LoanCalculations AS (
                SELECT 
                    l.loan_id,
                    l.amount,
                    l.interest_rate,
                    l.payment_frequency,
                    l.next_due_date,
                    CASE 
                        WHEN l.next_due_date < GETDATE() THEN
                            -- Base interest (adjusted for frequency) plus overdue fees
                            CASE l.payment_frequency
                                WHEN 'Weekly' THEN (l.amount * l.interest_rate/100) / 4 -- Weekly base (1/4 of monthly)
                                WHEN 'Fortnightly' THEN (l.amount * l.interest_rate/100) / 2 -- Fortnightly base (1/2 of monthly)
                                WHEN 'Monthly' THEN (l.amount * l.interest_rate/100) -- Full monthly base
                                WHEN 'Quarterly' THEN (l.amount * l.interest_rate/100) * 3 -- Quarterly base (3x monthly)
                                WHEN 'Semi-annually' THEN (l.amount * l.interest_rate/100) * 6 -- Semi-annual base (6x monthly)
                                WHEN 'Annually' THEN (l.amount * l.interest_rate/100) * 12 -- Annual base (12x monthly)
                            END +
                            -- Plus overdue fees
                            CASE l.payment_frequency
                                WHEN 'Weekly' THEN (l.amount * l.interest_rate/100) / 7 * DATEDIFF(day, l.next_due_date, GETDATE())
                                WHEN 'Fortnightly' THEN (l.amount * l.interest_rate/100) / 15 * DATEDIFF(day, l.next_due_date, GETDATE())
                                WHEN 'Monthly' THEN (l.amount * l.interest_rate/100) / 30 * DATEDIFF(day, l.next_due_date, GETDATE())
                                WHEN 'Quarterly' THEN (l.amount * l.interest_rate/100) / 90 * DATEDIFF(day, l.next_due_date, GETDATE())
                                WHEN 'Semi-annually' THEN (l.amount * l.interest_rate/100) / 180 * DATEDIFF(day, l.next_due_date, GETDATE())
                                WHEN 'Annually' THEN (l.amount * l.interest_rate/100) / 365 * DATEDIFF(day, l.next_due_date, GETDATE())
                            END
                        ELSE
                            -- Just the regular period interest if not overdue
                            CASE l.payment_frequency
                                WHEN 'Weekly' THEN (l.amount * l.interest_rate/100) / 4 -- Weekly base (1/4 of monthly)
                                WHEN 'Fortnightly' THEN (l.amount * l.interest_rate/100) / 2 -- Fortnightly base (1/2 of monthly)
                                WHEN 'Monthly' THEN (l.amount * l.interest_rate/100) -- Full monthly base
                                WHEN 'Quarterly' THEN (l.amount * l.interest_rate/100) * 3 -- Quarterly base (3x monthly)
                                WHEN 'Semi-annually' THEN (l.amount * l.interest_rate/100) * 6 -- Semi-annual base (6x monthly)
                                WHEN 'Annually' THEN (l.amount * l.interest_rate/100) * 12 -- Annual base (12x monthly)
                            END
                    END as calculated_interest
                FROM loans l
            )
            SELECT 
                b.first_name + ' ' + b.last_name AS BorrowerName,
                FORMAT(l.next_due_date, 'MMM dd, yyyy') AS DueDate,
                l.amount,
                l.interest_rate,
                l.payment_frequency,
                l.term_months,
                l.loan_id AS LoanId,
                DATEDIFF(DAY, l.next_due_date, GETDATE()) AS DaysLate,
                lc.calculated_interest
            FROM loans l
            INNER JOIN borrowers b ON l.borrower_id = b.borrower_id
            INNER JOIN LoanCalculations lc ON l.loan_id = lc.loan_id
            WHERE l.user_id = @userId 
            AND l.status NOT IN ('Paid', 'Cancelled')
            AND (
                l.next_due_date < GETDATE() -- Overdue loans
                OR l.next_due_date <= DATEADD(day, 7, GETDATE()) -- Due within next 7 days
            )
            ORDER BY 
                CASE 
                    WHEN l.next_due_date < GETDATE() THEN 0 -- Overdue loans come first
                    ELSE 1 -- Upcoming loans come after
                END,
                DATEDIFF(DAY, GETDATE(), l.next_due_date) ASC
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const data = result.recordset.map(row => {
            return {
                borrower: row.BorrowerName,
                dueDate: row.DueDate,
                amountDue: row.calculated_interest.toFixed(2),
                status: row.DaysLate > 0 ? 'Overdue' : 'On-time',
                loanId: row.LoanId
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching payments:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: 'Failed to fetch payments ' });
    }
});




// Summary Boxes
app.get('/api/summary/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const pool = await connectToDB();
        const totalBorrowers = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT COUNT(*) AS count FROM borrowers WHERE user_id = @userId');

        const totalLoaned = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`SELECT SUM(amount) AS sum FROM loans WHERE user_id = @userId and status != 'paid'`);

        const totalPayments = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT SUM(total_payment) AS sum FROM payments WHERE user_id = @userId');

        const totalOverdue = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) AS count 
                FROM loans 
                WHERE user_id = @userId 
                AND status NOT IN ('Paid', 'Cancelled')
                AND next_due_date < GETDATE();
            `);

        res.json({
            borrowers: totalBorrowers.recordset[0].count,
            loaned: totalLoaned.recordset[0].sum || 0,
            payments: totalPayments.recordset[0].sum || 0,
            overdue: totalOverdue.recordset[0].count
        });

    } catch (err) {
        console.error("Error fetching summary:", err);
        res.status(500).json({ error: 'Failed to fetch summary data' });
    }
});

// Utility function to generate borrower ID
async function generateBorrowerId() {
    const pool = await connectToDB();
    const result = await pool.request()
        .query(`SELECT TOP 1 borrower_id FROM borrowers ORDER BY borrower_id DESC`);

    let counter = 1;
    if (result.recordset.length > 0) {
        const lastId = result.recordset[0].borrower_id;
        counter = parseInt(lastId.split('-')[1]) + 1;
    }
    return `BR-${counter.toString().padStart(3, '0')}`;
}

// Adding borrower
app.post('/addBorrower', upload.single('photoId'), async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const borrowerId = await generateBorrowerId();
        
        // Handle empty values
        const middleName = req.body.middlename || 'None';
        const gcashNumber = req.body.gcash || 'None';
        const photoPath = req.file ? `${req.file.filename}` : 'None';

        const pool = await connectToDB();
        await pool.request()
            .input('borrowerId', borrowerId)
            .input('userId', userId)
            .input('firstName', req.body.firstname)
            .input('lastName', req.body.lastname)
            .input('middleName', middleName)
            .input('contact', req.body.contact)
            .input('email', req.body.email)
            .input('gender', req.body.gender)
            .input('birthdate', req.body.birthdate)
            .input('address', req.body.address)
            .input('gcash', gcashNumber)
            .input('photoId', photoPath)
            .query(`
                INSERT INTO borrowers (
                    borrower_id, user_id, first_name, last_name, middle_name,
                    contact_number, email, gender, birthdate, address,
                    status, gcash_number, photo_id
                ) VALUES (
                    @borrowerId, @userId, @firstName, @lastName, @middleName,
                    @contact, @email, @gender, @birthdate, @address,
                    'Inactive', @gcash, @photoId
                )`);

        res.send({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving borrower');
    }
});




// Fetch Data to Borrowers List

app.get('/api/borrowers/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { filter, search } = req.query;

    console.log("Received userId:", userId);
    
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {   
        const pool = await connectToDB();

        let query = `
    WITH LoanPayments AS (
        SELECT 
            l.loan_id,
            l.borrower_id,
            l.user_id,
            l.amount,
            l.interest_rate,
            l.next_due_date,
            l.payment_frequency,
            l.status,
            l.remaining_principal,
            l.remaining_interest,
            ISNULL(SUM(p.principal_paid), 0) as total_principal_paid,
            ISNULL(SUM(p.interest_paid), 0) as total_interest_paid
        FROM loans l
        LEFT JOIN payments p ON l.loan_id = p.loan_id
        GROUP BY l.loan_id, l.borrower_id, l.user_id, l.amount, l.interest_rate, l.next_due_date, l.payment_frequency, l.status, l.remaining_principal, l.remaining_interest
    ),
    LoanCalculations AS (
        SELECT 
            borrower_id,
            user_id,
            COUNT(CASE WHEN status NOT IN ('Paid', 'Cancelled') THEN 1 END) as total_active_loans,
            SUM(amount) as total_amount_borrowed,
            SUM(CASE 
                WHEN status NOT IN ('Paid', 'Cancelled') THEN 
                    remaining_principal + remaining_interest
                ELSE 0 
            END) as remaining_balance
        FROM LoanPayments
        GROUP BY borrower_id, user_id
    )
    SELECT 
        b.borrower_id,
        b.first_name + ' ' + b.last_name AS BorrowerName,
        b.first_name,
        b.last_name,
        b.middle_name,
        b.email,
        b.contact_number,
        b.gender,
        b.photo_id,
        b.status,
        FORMAT(b.birthdate, 'MMM dd, yyyy') AS birthdate,
        b.address,
        b.gcash_number,
        ISNULL(lc.total_active_loans, 0) as total_active_loans,
        ISNULL(lc.total_amount_borrowed, 0) as total_amount_borrowed,
        ISNULL(lc.remaining_balance, 0) as remaining_balance,
        (SELECT ISNULL(SUM(total_payment), 0)
         FROM payments p
         WHERE p.borrower_id = b.borrower_id
         AND p.user_id = b.user_id) AS total_paid
    FROM 
        borrowers b
        LEFT JOIN LoanCalculations lc ON b.borrower_id = lc.borrower_id AND b.user_id = lc.user_id
    WHERE 
        b.user_id = @userId;
        `;

        if (filter && search) {
            query += ` AND ${filter} LIKE '%${search.replace(/'/g, "''")}%'`;
        }
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const data = result.recordset.map(row => {

            return {
                borrowerId: row.borrower_id,
                borrower: row.BorrowerName,
                firstName: row.first_name,
                lastName: row.last_name,
                middleName: row.middle_name,
                email: row.email,
                contact: row.contact_number,
                gender: row.gender,
                birthDate: row.birthdate,
                address: row.address,
                gcash: row.gcash_number,
                totalActiveLoans: row.total_active_loans,
                totalAmountBorrowed: row.total_amount_borrowed,
                totalPaid: row.total_paid,
                remainingPrincipal: row.remaining_balance,
                photoId: row.photo_id,
                status: row.status
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching Borrowers:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: 'Failed to fetch Borrowers ' });
    }
});


// Delete Borrower
app.post('/delete-borrower', async (req, res) => {
    const { borrowerId, password, photoPath } = req.body;
    const userId = req.session.user.user_id;

    try {
        const pool = await connectToDB();
        
        // 1. Verify password
        const userResult = await pool.request()
            .input('userId', userId)
            .query('SELECT password FROM users WHERE user_id = @userId');

        if (userResult.recordset.length === 0 || 
            userResult.recordset[0].password !== password) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // 2. Delete associated payments first
        await pool.request()
            .input('borrowerId', borrowerId)
            .query('DELETE FROM payments WHERE borrower_id = @borrowerId');

        // 3. Delete associated loans
        await pool.request()
            .input('borrowerId', borrowerId)
            .query('DELETE FROM loans WHERE borrower_id = @borrowerId');

        // 4. Delete borrower
        await pool.request()
            .input('borrowerId', borrowerId)
            .query('DELETE FROM borrowers WHERE borrower_id = @borrowerId');

        // 5. Delete photo file if exists
        if (photoPath && photoPath !== 'None') {
            const filePath = path.join(__dirname, 'public', 'uploads', photoPath);
    
            fs.unlink(filePath, (err) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // File already doesn't exist — that's okay
                        console.warn('File not found, already deleted:', filePath);
                    } else {
                        console.error('File deletion error:', err);
                    }
                } else {
                    console.log('File deleted successfully:', filePath);
                }
            });
        }

        res.json({ success: true, message: 'Borrower deleted!' });
    } catch (err) {
        console.error('Deletion error:', err);
        res.status(500).json({ message: 'Error deleting borrower' });
    }
});

// Update Borrower
app.post('/update-borrower', upload.single('photoId'), async (req, res) => {
    try {
        const pool = await connectToDB();
        const {
            borrowerId,
            firstName,
            lastName,
            middleName,
            email,
            contact,
            gender,
            birthdate,
            address,
            gcash
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !middleName || !email || !contact || !gender || !birthdate || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate contact and gcash number format (11 digits)
        const numberPattern = /^\d{11}$/;
        if (contact && !numberPattern.test(contact)) {
            return res.status(400).json({ message: 'Contact number must be 11 digits' });
        }
        if (gcash && gcash !== 'None' && !numberPattern.test(gcash)) {
            return res.status(400).json({ message: 'GCash number must be 11 digits' });
        }

        let updateQuery = `
            UPDATE borrowers 
            SET first_name = @firstName,
                last_name = @lastName,
                middle_name = @middleName,
                email = @email,
                contact_number = @contact,
                gender = @gender,
                birthdate = @birthdate,
                address = @address,
                gcash_number = @gcash
        `;

        // If new photo is uploaded, update photo_id
        if (req.file) {
            updateQuery += `, photo_id = @photoId`;
        }

        updateQuery += ` WHERE borrower_id = @borrowerId`;

        const request = pool.request()
            .input('borrowerId', borrowerId)
            .input('firstName', firstName)
            .input('lastName', lastName)
            .input('middleName', middleName)
            .input('email', email)
            .input('contact', contact)
            .input('gender', gender)
            .input('birthdate', birthdate)
            .input('address', address)
            .input('gcash', gcash || 'None');

        if (req.file) {
            // Get the old photo path before updating
            const oldPhotoResult = await pool.request()
                .input('borrowerId', borrowerId)
                .query('SELECT photo_id FROM borrowers WHERE borrower_id = @borrowerId');

            const oldPhotoId = oldPhotoResult.recordset[0]?.photo_id;
            // Update with new photo
            request.input('photoId', req.file.filename);

            // Delete old photo if it exists and is not 'None'
            if (oldPhotoId && oldPhotoId !== 'None') {
                const oldFilePath = path.join(__dirname, 'public', 'uploads', oldPhotoId);
                fs.unlink(oldFilePath, (err) => {
                    if (err && err.code !== 'ENOENT') {
                        console.error('Error deleting old photo:', err);
                    }
                });
            }
        }

        await request.query(updateQuery);

        res.json({ success: true, message: 'Borrower updated successfully!' });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ message: 'Error updating borrower' });
    }
});




// Fetch Data to Loans List
app.get('/api/loans/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { filter, search } = req.query;

    console.log("Received userId:", userId);
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {   
        const pool = await connectToDB();

        let query = `
            SELECT 
                l.loan_id,
                b.borrower_id,
                b.first_name + ' ' + b.last_name AS borrower,
                l.amount,
                l.interest_rate as interest,
                l.term_months as term,
                l.payment_frequency,
                FORMAT(l.next_due_date, 'MMM dd, yyyy') as nextDueDate,
                FORMAT(l.date_borrowed, 'MMM dd, yyyy') as date_borrowed,
                l.status,
                ISNULL(l.remaining_principal, l.amount) as remaining_principal,
                ISNULL(l.remaining_interest, 0) as remaining_interest,
                l.agreement_photo,
                b.contact_number as phone,
                b.email,
                b.address
            FROM loans l
            JOIN borrowers b ON l.borrower_id = b.borrower_id
            WHERE l.user_id = @userId
        `;

        // Add filtering logic
        if (filter && search) {
            switch(filter) {
                case 'borrower':
                    query += ` AND (b.first_name + ' ' + b.last_name) LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
                case 'interestRate':
                    query += ` AND l.interest_rate = ${parseFloat(search)}`;
                    break;
                case 'dateBorrowed':
                    query += ` AND CONVERT(DATE, l.date_borrowed) = CONVERT(DATE, '${search}')`;
                    break;
                case 'balance>':
                    query += ` AND (ISNULL(l.remaining_principal, l.amount) + ISNULL(l.remaining_interest, 0)) > ${parseFloat(search)}`;
                    break;
                case 'balance<':
                    query += ` AND (ISNULL(l.remaining_principal, l.amount) + ISNULL(l.remaining_interest, 0)) < ${parseFloat(search)}`;
                    break;
                case 'amount>':
                    query += ` AND l.amount > ${parseFloat(search)}`;
                    break;
                case 'amount<':
                    query += ` AND l.amount < ${parseFloat(search)}`;
                    break;
                case 'status':
                    query += ` AND l.status LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
            }
        }
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        const data = result.recordset.map(row => {
            // Calculate balance
            const remainingPrincipal = parseFloat(row.remaining_principal) || 0;
            const remainingInterest = parseFloat(row.remaining_interest) || 0;
            const balance = remainingPrincipal + remainingInterest;

            return {
                loanId: row.loan_id,
                borrowerId: row.borrower_id,
                borrower: row.borrower,
                amount: parseFloat(row.amount),
                interest: parseFloat(row.interest),
                status: row.status,
                balance: balance.toFixed(2),
                term: row.term,
                paymentFrequency: row.payment_frequency,
                nextDueDate: row.nextDueDate,
                dateBorrowed: row.date_borrowed || null,
                remaining_principal: remainingPrincipal,
                remaining_interest: remainingInterest,
                total_balance: balance.toFixed(2),
                agreementPhoto: row.agreement_photo,
                phone: row.phone,
                email: row.email,
                address: row.address
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching Loans:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: 'Failed to fetch Loans' });
    }
});

// Utility function to generate loan ID
async function generateLoanId() {
    const pool = await connectToDB();
    const result = await pool.request()
        .query(`SELECT TOP 1 loan_id FROM loans ORDER BY loan_id DESC`);

    let counter = 1;
    if (result.recordset.length > 0) {
        const lastId = result.recordset[0].loan_id;
        counter = parseInt(lastId.split('-')[1]) + 1;
    }
    return `LN-${counter}`;
}

// Function to calculate next due date based on payment frequency
function calculateNextDueDate(startDate, frequency) {
    const date = new Date(startDate);

    // Helper function to get last day of a month
    function getLastDayOfMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // Helper function to add months and preserve the day of month where possible
    function addMonths(date, months) {
        const targetDate = new Date(date);
        const originalDay = date.getDate();
        
        // First set to 1st of target month to avoid skipping months
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() + months);
        
        // Get the last day of the target month
        const lastDay = getLastDayOfMonth(targetDate.getFullYear(), targetDate.getMonth());
        
        // Set to either original day or last day of month if original day doesn't exist
        targetDate.setDate(Math.min(originalDay, lastDay));
        
        return targetDate;
    }

    // Create a new date object to avoid modifying the original
    const newDate = new Date(date);

    switch(frequency) {
        case 'Weekly':
            newDate.setDate(newDate.getDate() + 7);
            break;
        case 'Fortnightly':
            newDate.setDate(newDate.getDate() + 14);
            break;
        case 'Monthly':
            return addMonths(newDate, 1);
        case 'Quarterly':
            return addMonths(newDate, 3);
        case 'Semi-annually':
            return addMonths(newDate, 6);
        case 'Annually':
            return addMonths(newDate, 12);
        default:
            console.error('Invalid payment frequency:', frequency);
            return newDate;
    }

    return newDate;
}

// Function to update borrower status based on loan balance
async function updateBorrowerStatus(borrowerId, pool) {
    try {
        // Get total remaining balance for all loans
        const balanceResult = await pool.request()
            .input('borrowerId', borrowerId)
            .query(`
                WITH LoanCalculations AS (
                    SELECT 
                        l.loan_id,
                        l.amount,
                        l.interest_rate,
                        l.status,
                        ISNULL((
                            SELECT SUM(total_payment)
                            FROM payments
                            WHERE loan_id = l.loan_id
                        ), 0) as total_paid
                    FROM loans l
                    WHERE l.borrower_id = @borrowerId
                    AND l.status != 'Cancelled'  -- Exclude cancelled loans
                )
                SELECT 
                    SUM(CASE 
                        WHEN status = 'Paid' THEN 0
                        ELSE amount + (amount * interest_rate/100) - total_paid 
                    END) as total_balance
                FROM LoanCalculations
            `);

        const totalBalance = balanceResult.recordset[0].total_balance || 0;
        console.log(`Borrower ${borrowerId} total balance:`, totalBalance);
        
        // Update borrower status based on balance
        const newStatus = totalBalance > 0 ? 'Active' : 'Inactive';
        console.log(`Updating borrower ${borrowerId} status to:`, newStatus);
        
        await pool.request()
            .input('borrowerId', borrowerId)
            .input('status', newStatus)
            .query(`
                UPDATE borrowers 
                SET status = @status 
                WHERE borrower_id = @borrowerId
            `);
    } catch (err) {
        console.error('Error updating borrower status:', err);
    }
}

// Adding loan endpoint
app.post('/addLoan', upload.single('loanAgreement'), async (req, res) => {
    const pool = await connectToDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const {
            borrowerId,
            loanAmount,
            loanTerm,
            interestRate,
            startDate,
            paymentFrequency
        } = req.body;

        // Validate required fields
        if (!borrowerId || !loanAmount || !interestRate || !paymentFrequency) {
            throw new Error('Missing required fields');
        }

        // Validate numeric fields
        const amount = parseFloat(loanAmount);
        const interest = parseFloat(interestRate);
        const term = loanTerm || 'Flex'; // Changed to use 'Flex' as default

        if (amount <= 0 || interest <= 0 || interest > 100 || (term !== 'Flex' && parseInt(term) <= 0)) {
            throw new Error('Invalid numeric values');
        }

        const loanId = await generateLoanId();
        const nextDueDate = calculateNextDueDate(startDate || new Date(), paymentFrequency);
        const agreementPhoto = req.file ? req.file.filename : null;

        // Calculate initial interest based on payment frequency
        const initialInterest = (() => {
            switch(paymentFrequency) {
                case 'Weekly': return (amount * interest/100) / 4;
                case 'Fortnightly': return (amount * interest/100) / 2;
                case 'Monthly': return amount * interest/100;
                case 'Quarterly': return (amount * interest/100) * 3;
                case 'Semi-annually': return (amount * interest/100) * 6;
                case 'Annually': return (amount * interest/100) * 12;
                default: return amount * interest/100;
            }
        })();

        // Insert new loan
        await pool.request()
            .input('loanId', loanId)
            .input('borrowerId', borrowerId)
            .input('userId', req.session.user.user_id)
            .input('amount', amount)
            .input('interestRate', interest)
            .input('termMonths', term)
            .input('dateBorrowed', startDate || new Date())
            .input('paymentFrequency', paymentFrequency)
            .input('nextDueDate', nextDueDate)
            .input('agreementPhoto', agreementPhoto)
            .input('remainingPrincipal', amount)
            .input('remainingInterest', initialInterest)
            .query(`
                INSERT INTO loans (
                    loan_id, borrower_id, user_id, amount, interest_rate,
                    term_months, date_borrowed, payment_frequency, next_due_date,
                    status, agreement_photo, remaining_principal, remaining_interest
                ) VALUES (
                    @loanId, @borrowerId, @userId, @amount, @interestRate,
                    @termMonths, ISNULL(@dateBorrowed, GETDATE()), @paymentFrequency, @nextDueDate,
                    'Ongoing', @agreementPhoto, @remainingPrincipal, @remainingInterest
                )
            `);

        // Update borrower status
        await updateBorrowerStatus(borrowerId, pool);

        await transaction.commit();
        res.json({ success: true, message: 'Loan added successfully!' });

    } catch (err) {
        await transaction.rollback();
        console.error('Error adding loan:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Error adding loan' 
        });
    }
});

// Sample DB route (optional)
app.get('/test-db', async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query('SELECT 1 AS Test');
        res.send('Database connected and query successful!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Database connection or query failed.');
    }
});

// Payment History API
app.get('/api/payment-history/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { filter, search } = req.query;
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    try {
        const pool = await connectToDB();
        let query = `
            SELECT 
                p.payment_id,
                p.payment_date,
                b.first_name + ' ' + b.last_name AS borrower,
                p.loan_id,
                p.principal_paid,
                p.interest_paid,
                p.late_payment_fee,
                p.total_payment,
                p.payment_method,
                p.delay_days,
                p.receipt,
                p.notes
            FROM payments p
            INNER JOIN borrowers b ON p.borrower_id = b.borrower_id
            INNER JOIN loans l ON p.loan_id = l.loan_id
            WHERE p.user_id = @userId
        `;
        if (filter && search) {
            switch(filter) {
                case 'borrower':
                    query += ` AND (b.first_name + ' ' + b.last_name) LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
                case 'loanId':
                    query += ` AND p.loan_id LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
                case 'paymentDate':
                    query += ` AND FORMAT(p.payment_date, 'MMM dd, yyyy') LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
                case 'paymentMethod':
                    query += ` AND p.payment_method LIKE '%${search.replace(/'/g, "''")}%'`;
                    break;
                case 'amount':
                    query += ` AND p.total_payment = ${parseFloat(search)}`;
                    break;
            }
        }
        query += ' ORDER BY p.payment_date DESC, p.payment_id DESC';
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);
        const data = result.recordset.map(row => ({
            paymentId: row.payment_id,
            paymentDate: row.payment_date,
            borrower: row.borrower,
            loanId: row.loan_id,
            principal: row.principal_paid,
            interest: row.interest_paid,
            fee: row.late_payment_fee,
            total: row.total_payment,
            paymentMethod: row.payment_method,
            delay: row.delay_days < 0 ? 0 : row.delay_days,
            receipt: row.receipt,
            notes: row.notes
        }));
        res.json(data);
    } catch (err) {
        console.error('Error fetching payment history:', err);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Add Payment endpoint
app.post('/addPayment', upload.single('receipt'), async (req, res) => {
    const pool = await connectToDB();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const userId = req.session.user.user_id;
        const {
            borrowerId,
            loanId,
            paymentDate = formatDateForSQL(req.body.paymentDate), // Ensure date is formatted correctly
            paymentMethod,
            principalPaid,
            interestPaid,
            delay,
            lateFee,
            notes,
            totalPayment
        } = req.body;

        // Validate required fields
        if (!borrowerId || !loanId || !paymentDate || !paymentMethod || !principalPaid || !interestPaid) {
            throw new Error('Missing required fields');
        }

        // Get current loan details
        const loanResult = await pool.request()
            .input('loanId', loanId)
            .query(`
                SELECT 
                    l.*,
                    l.interest_rate,
                    l.payment_frequency,
                    l.next_due_date,
                    l.remaining_principal,
                    l.remaining_interest
                FROM loans l
                WHERE l.loan_id = @loanId
            `);

        if (loanResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        const loan = loanResult.recordset[0];
        const paymentDateStr = paymentDate;
        const amount = parseFloat(totalPayment);
        const isOverdue = paymentDate > new Date(loan.next_due_date);

        // Calculate interest and principal portions
        let interestPortion = 0;
        let principalPortion = 0;
        let remainingInterest = parseFloat(loan.remaining_interest) || 0;
        let remainingPrincipal = parseFloat(loan.remaining_principal) || loan.amount;

        // Calculate overdue fee if applicable
        let overdueFee = 0;
        if (isOverdue) {
            const daysOverdue = Math.ceil((paymentDate - new Date(loan.next_due_date)) / (1000 * 60 * 60 * 24));
            const periodDays = loan.payment_frequency === 'Weekly' ? 7 :
                loan.payment_frequency === 'Fortnightly' ? 14 :
                loan.payment_frequency === 'Monthly' ? 30 :
                loan.payment_frequency === 'Quarterly' ? 90 :
                loan.payment_frequency === 'Semi-annually' ? 180 : 365;
            overdueFee = (remainingPrincipal * loan.interest_rate/100) / periodDays * daysOverdue;
            remainingInterest += overdueFee;
        }

        // Apply payment to interest first, then principal
        if (amount <= remainingInterest) {
            // Payment is less than or equal to remaining interest
            interestPortion = amount;
            remainingInterest -= amount;
        } else {
            // Payment exceeds remaining interest
            interestPortion = remainingInterest;
            principalPortion = amount - remainingInterest;
            remainingInterest = 0;
            remainingPrincipal -= principalPortion;
        }

        // Update loan balances
        await pool.request()
            .input('loanId', loanId)
            .input('remainingPrincipal', remainingPrincipal)
            .input('remainingInterest', remainingInterest)
            .query(`
                UPDATE loans 
                SET remaining_principal = @remainingPrincipal,
                    remaining_interest = @remainingInterest
                WHERE loan_id = @loanId
            `);

        // Insert payment record
        // Parse paymentDate to a Date object
        // Parse paymentDate ("YYYY-MM-DD") as local date, not UTC
let paymentDateObj;
if (typeof paymentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    // Split and construct as local date
    const [year, month, day] = paymentDate.split('-').map(Number);
    paymentDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
} else {
    paymentDateObj = new Date(paymentDate);
}
console.log('paymentDate from client:', paymentDate, 'Parsed:', paymentDateObj);

if (isNaN(paymentDateObj.getTime())) {
    throw new Error('Invalid payment date: ' + paymentDate);
}

// Ensure paymentDate is in YYYY-MM-DD format for SQL DATE column
let paymentDateSQL;
if (typeof paymentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    paymentDateSQL = paymentDate;
} else {
    // Try to parse and format
    const d = new Date(paymentDate);
    if (isNaN(d.getTime())) {
        throw new Error('Invalid payment date: ' + paymentDate);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    paymentDateSQL = `${yyyy}-${mm}-${dd}`;
}
console.log('paymentDate from client:', paymentDate, 'SQL:', paymentDateSQL);

        await pool.request()
            .input('loanId', loanId)
            .input('borrowerId', borrowerId)
            .input('userId', userId)
            .input('amount', amount)
            .input('paymentDate', sql.Date, paymentDateSQL) // <-- use sql.Date and formatted string
            .input('interestPortion', interestPortion)
            .input('principalPortion', principalPortion)
            .input('overdueFee', overdueFee)
            .input('paymentMethod', paymentMethod)
            .input('notes', notes)
            .input('totalPayment', amount)
            .query(`
                INSERT INTO payments (
                    loan_id, borrower_id, user_id, payment_date,
                    interest_paid, principal_paid, late_payment_fee,
                    payment_method, notes, total_payment
                ) VALUES (
                    @loanId, @borrowerId, @userId, @paymentDate,
                    @interestPortion, @principalPortion, @overdueFee,
                    @paymentMethod, @notes, @totalPayment
                )
            `);
            
              // Calculate current period interest
            const currentPeriodInterest = (loan.remaining_principal * loan.interest_rate / 100) 

              // Get interest paid in current period (including this payment)
            const periodStart = calculatePreviousDueDate(loan.next_due_date, loan.payment_frequency);
            const interestResult = await pool.request()
            .input('loanId', loanId)
            .input('startDate', periodStart)
            .input('endDate', loan.next_due_date)
            .query(`
                SELECT COALESCE(SUM(interest_paid), 0) AS existingInterest
                FROM payments 
                WHERE loan_id = @loanId
                AND payment_date >= @startDate
                AND payment_date < @endDate
            `);

            const totalInterestPaid = interestResult.recordset[0].existingInterest + parseFloat(interestPortion);

            // Update next due date if enough interest paid
            if (totalInterestPaid >= currentPeriodInterest) {
                const newDueDate = calculateNextDueDate(loan.next_due_date, loan.payment_frequency);

                await pool.request()
                    .input('loanId', loanId)
                    .input('newDueDate', newDueDate)
                    .query(`
                        UPDATE loans
                        SET next_due_date = @newDueDate
                        WHERE loan_id = @loanId
                    `);
            }


        // Update loan status if fully paid
        if (remainingPrincipal <= 0) {
            await pool.request()
                .input('loanId', loanId)
                .query('UPDATE loans SET status = \'Paid\' WHERE loan_id = @loanId');
        }

        res.json({ 
            message: 'Payment added successfully',
            interestPortion,
            principalPortion,
            overdueFee,
            remainingBalance: remainingPrincipal + remainingInterest + overdueFee
        });
    } catch (err) {
        await transaction.rollback();
        console.error('Error recording payment:', err);
        res.status(500).json({ success: false, message: err.message || 'Error recording payment' });
    }
});

function calculatePreviousDueDate(currentDueDate, frequency) {
    const date = new Date(currentDueDate);
    switch(frequency) {
        case 'Weekly': date.setDate(date.getDate() - 7); break;
        case 'Fortnightly': date.setDate(date.getDate() - 14); break;
        case 'Monthly': date.setMonth(date.getMonth() - 1); break;
        case 'Quarterly': date.setMonth(date.getMonth() - 3); break;
        case 'Semi-annually': date.setMonth(date.getMonth() - 6); break;
        case 'Annually': date.setFullYear(date.getFullYear() - 1); break;
    }
    return date;
}

function formatDateForSQL(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // Returns "2025-05-24"
}





// API endpoint for fetching borrowers for record payment
app.get('/api/borrowers-for-payment/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    borrower_id,
                    first_name + ' ' + last_name AS full_name,
                    status
                FROM borrowers 
                WHERE user_id = @userId
                ORDER BY full_name
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching borrowers:', err);
        res.status(500).json({ error: 'Failed to fetch borrowers' });
    }
});

// API endpoint for fetching loans for a specific borrower
app.get('/api/loans-for-payment/:userId/:borrowerId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const borrowerId = req.params.borrowerId;
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('borrowerId', borrowerId)
            .query(`
                WITH LoanCalculations AS (
                    SELECT 
                        l.loan_id,
                        l.amount,
                        l.interest_rate,
                        l.next_due_date,
                        l.status,
                        l.payment_frequency,
                        -- Calculate current period interest (excluding overdue fees)
                        CASE l.payment_frequency
                            WHEN 'Weekly' THEN (l.amount * l.interest_rate/100) / 4
                            WHEN 'Fortnightly' THEN (l.amount * l.interest_rate/100) / 2
                            WHEN 'Monthly' THEN (l.amount * l.interest_rate/100)
                            WHEN 'Quarterly' THEN (l.amount * l.interest_rate/100) * 3
                            WHEN 'Semi-annually' THEN (l.amount * l.interest_rate/100) * 6
                            WHEN 'Annually' THEN (l.amount * l.interest_rate/100) * 12
                        END as current_period_interest,
                        -- Get total paid for this loan
                        (
                            SELECT ISNULL(SUM(total_payment), 0)
                            FROM payments
                            WHERE loan_id = l.loan_id
                        ) as total_paid,
                        -- Get interest paid in current period
                        (
                            SELECT ISNULL(SUM(interest_paid), 0)
                            FROM payments p
                            WHERE p.loan_id = l.loan_id
                            AND p.payment_date >=
                                CASE l.payment_frequency
                                    WHEN 'Weekly' THEN DATEADD(WEEK, -1, l.next_due_date)
                                    WHEN 'Fortnightly' THEN DATEADD(DAY, -14, l.next_due_date)
                                    WHEN 'Monthly' THEN DATEADD(MONTH, -1, l.next_due_date)
                                    WHEN 'Quarterly' THEN DATEADD(MONTH, -3, l.next_due_date)
                                    WHEN 'Semi-annually' THEN DATEADD(MONTH, -6, l.next_due_date)
                                    WHEN 'Annually' THEN DATEADD(YEAR, -1, l.next_due_date)
                                END
                            AND p.payment_date < l.next_due_date
                        ) as interest_paid_this_period,
                        -- Calculate days into current period
                        CASE 
                            WHEN l.next_due_date > GETDATE() THEN
                                DATEDIFF(DAY,
                                    CASE l.payment_frequency
                                        WHEN 'Weekly' THEN DATEADD(WEEK, -1, l.next_due_date)
                                        WHEN 'Fortnightly' THEN DATEADD(DAY, -14, l.next_due_date)
                                        WHEN 'Monthly' THEN DATEADD(MONTH, -1, l.next_due_date)
                                        WHEN 'Quarterly' THEN DATEADD(MONTH, -3, l.next_due_date)
                                        WHEN 'Semi-annually' THEN DATEADD(MONTH, -6, l.next_due_date)
                                        WHEN 'Annually' THEN DATEADD(YEAR, -1, l.next_due_date)
                                    END,
                                    GETDATE()
                                )
                            ELSE 0
                        END as days_into_period
                    FROM loans l
                )
                SELECT 
                    l.loan_id,
                    l.amount,
                    l.interest_rate,
                    l.next_due_date,
                    l.status,
                    l.payment_frequency,
                    lc.current_period_interest,
                    lc.total_paid,
                    lc.interest_paid_this_period,
                    CASE 
                        WHEN l.next_due_date > GETDATE() THEN
                            (lc.current_period_interest * lc.days_into_period / 
                                CASE l.payment_frequency
                                    WHEN 'Weekly' THEN 7
                                    WHEN 'Fortnightly' THEN 14
                                    WHEN 'Monthly' THEN 30
                                    WHEN 'Quarterly' THEN 90
                                    WHEN 'Semi-annually' THEN 180
                                    WHEN 'Annually' THEN 365
                                END) - lc.interest_paid_this_period
                        ELSE lc.current_period_interest - lc.interest_paid_this_period
                    END as remaining_interest,
                    ISNULL(l.remaining_principal, l.amount) as remaining_principal
                FROM loans l
                INNER JOIN LoanCalculations lc ON l.loan_id = lc.loan_id
                WHERE l.user_id = @userId 
                AND l.borrower_id = @borrowerId
                AND l.status != 'Paid'
                ORDER BY l.next_due_date
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching loans:', err);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
});

// Cancel Loan endpoint
app.post('/cancel-loan', async (req, res) => {
    const { loanId, password } = req.body;
    const userId = req.session.user_id;
    try {
        const pool = await connectToDB();
        // 1. Verify password
        const userResult = await pool.request()
            .input('userId', userId)
            .query('SELECT password FROM users WHERE user_id = @userId');
        if (userResult.recordset.length === 0 || userResult.recordset[0].password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        // 2. Set loan status to Cancelled
        await pool.request()
            .input('loanId', loanId)
            .query('UPDATE loans SET status = \'Cancelled\' WHERE loan_id = @loanId');
        res.json({ success: true });
    } catch (err) {
        console.error('Error cancelling loan:', err);
        res.status(500).json({ success: false, message: 'Error cancelling loan' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});