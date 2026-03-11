from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from werkzeug.utils import secure_filename
from PIL import Image
from docx import Document as DocxDocument
from PyPDF2 import PdfMerger, PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import time
import random
import uuid

app = Flask(__name__)

# CORS Configuration
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://easyprint-backend.onrender.com").split(',')

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/pfp/*": {"origins": "*"},
    r"/processed/*": {"origins": "*"}
})

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
PROCESSED_FOLDER = os.path.join(APP_ROOT, 'processed')
DB_FILE = os.path.join(APP_ROOT, 'db.json')
USERS_FILE = os.path.join(APP_ROOT, 'users.json')
SHOPS_FILE = os.path.join(APP_ROOT, 'shops.json')
WALLETS_FILE = os.path.join(APP_ROOT, 'wallets.json')
TOPUP_EXPIRY_SECONDS = 300
MIN_TOPUP_AMOUNT = 1.0
MAX_TOPUP_AMOUNT = 50000.0

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
PFP_FOLDER = os.path.join(APP_ROOT, 'pfp')
os.makedirs(PFP_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['PFP_FOLDER'] = PFP_FOLDER

# ============== DB Helpers ==============
def read_json_file(filepath):
    if not os.path.exists(filepath):
        return {}
    with open(filepath, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def write_json_file(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

def read_db():
    return read_json_file(DB_FILE)

def write_db(data):
    write_json_file(DB_FILE, data)

def read_users():
    return read_json_file(USERS_FILE)

def write_users(data):
    write_json_file(USERS_FILE, data)

def read_shops():
    return read_json_file(SHOPS_FILE)

def write_shops(data):
    write_json_file(SHOPS_FILE, data)

def read_wallets():
    return read_json_file(WALLETS_FILE)

def write_wallets(data):
    write_json_file(WALLETS_FILE, data)

def round_currency(value):
    return round(float(value), 2)

def get_or_create_wallet(wallets, user_id):
    wallet = wallets.get(user_id)
    if not isinstance(wallet, dict):
        wallet = {"balance": 0.0, "transactions": []}
        wallets[user_id] = wallet

    wallet.setdefault('balance', 0.0)
    wallet.setdefault('transactions', [])
    wallet['balance'] = round_currency(wallet.get('balance', 0.0))
    return wallet

def find_wallet_transaction(wallet, transaction_id):
    for tx in wallet.get('transactions', []):
        if tx.get('transaction_id') == transaction_id:
            return tx
    return None

# ============== Auth Endpoints ==============
@app.route('/api/student/register', methods=['POST'])
def student_register():
    data = request.get_json()
    users = read_users()
    
    username = data.get('username')
    if username in [u['username'] for u in users.values()]:
        return jsonify({"success": False, "error": "Username already exists"}), 409

    user_id = str(uuid.uuid4())
    users[user_id] = {
        "user_id": user_id,
        "username": username,
        "password": data.get('password'), # In a real app, hash this!
        "role": "student"
    }
    write_users(users)

    # Initialize wallet
    wallets = read_wallets()
    wallets[user_id] = {"balance": random.randint(50, 200)} # Random EP-Coins
    write_wallets(wallets)

    return jsonify({"success": True, "user_id": user_id}), 201

@app.route('/api/student/login', methods=['POST'])
def student_login():
    data = request.get_json()
    users = read_users()
    
    username = data.get('username')
    password = data.get('password')

    for user_id, user in users.items():
        if user['role'] == 'student' and user['username'] == username and user['password'] == password:
            return jsonify({"success": True, "user_id": user_id, "username": user['username']}), 200
    
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/shop/register', methods=['POST'])
def shop_register():
    if 'profile_photo' not in request.files:
        return jsonify({"success": False, "error": "No profile photo uploaded"}), 400

    data = request.form
    shops = read_shops()
    
    username = data.get('username')
    if username in [s['username'] for s in shops.values()]:
        return jsonify({"success": False, "error": "Username already exists"}), 409

    photo = request.files['profile_photo']
    photo_filename = ""
    if photo:
        photo_filename = secure_filename(f"{username}_{photo.filename}")
        photo.save(os.path.join(app.config['PFP_FOLDER'], photo_filename))

    shop_id = str(uuid.uuid4())
    shops[shop_id] = {
        "shop_id": shop_id,
        "shop_name": data.get('shop_name'),
        "username": username,
        "password": data.get('password'), # Hash this!
        "location": data.get('location'),
        "profile_photo": photo_filename,
        "status": "Verification Pending",
        "isLive": True,  # Default to online when verified
        "pricing": { 
            "bw": float(data.get('bw_price', 1)), 
            "color": float(data.get('color_price', 5))
        }
    }
    write_shops(shops)
    return jsonify({"success": True, "shop_id": shop_id}), 201

@app.route('/api/superadmin/login', methods=['POST'])
def superadmin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username == "superadmin" and password == "Admin@123":
        return jsonify({"success": True, "role": "superadmin"}), 200
    
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/shop/login', methods=['POST'])
def shop_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    shops = read_shops()
    for shop_id, shop in shops.items():
        if shop['username'] == username and shop['password'] == password:
            if shop['status'] == 'Active':
                return jsonify({"success": True, "role": "shop", "shop_id": shop_id}), 200
            elif shop['status'] == 'Verification Pending':
                return jsonify({"success": False, "error": "Shop not verified"}), 403
            else:
                return jsonify({"success": False, "error": "Account inactive"}), 403

    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/shop/<shop_id>', methods=['GET'])
def get_shop_info(shop_id):
    shops = read_shops()
    if shop_id in shops:
        # Backfill legacy records that don't have explicit online/offline state.
        if 'isLive' not in shops[shop_id]:
            shops[shop_id]['isLive'] = True
            write_shops(shops)

        shop = shops[shop_id].copy()
        shop['isLive'] = bool(shop.get('isLive', True))
        # Don't expose password
        shop.pop('password', None)
        return jsonify(shop), 200
    return jsonify({"error": "Shop not found"}), 404

@app.route('/api/pricing', methods=['GET'])
def get_active_pricing():
    """Get pricing from the first active shop (for now, single shop system) - DEPRECATED, use /api/shops/active"""
    shops = read_shops()
    for shop_id, shop in shops.items():
        if shop.get('status') == 'Active':
            return jsonify({
                "shop_id": shop_id,
                "shop_name": shop.get('shop_name', 'Shop'),
                "pricing": shop.get('pricing', {"bw": 1, "color": 5})
            }), 200
    # Default pricing if no active shop
    return jsonify({
        "shop_id": None,
        "shop_name": "Default",
        "pricing": {"bw": 1, "color": 5}
    }), 200

@app.route('/api/shops/active', methods=['GET'])
def get_active_shops():
    """Get all active shops with their details"""
    shops = read_shops()
    active_shops = []
    data_changed = False
    
    for shop_id, shop in shops.items():
        if 'isLive' not in shop:
            shop['isLive'] = True
            data_changed = True

        if shop.get('status') == 'Active':
            shop_data = {
                "shop_id": shop_id,
                "shop_name": shop.get('shop_name', 'Shop'),
                "location": shop.get('location', 'N/A'),
                "pricing": shop.get('pricing', {"bw": 1, "color": 5}),
                "profile_photo": shop.get('profile_photo', ''),
                "isLive": bool(shop.get('isLive', True))  # Online/offline status
            }
            active_shops.append(shop_data)

    if data_changed:
        write_shops(shops)
    
    return jsonify(active_shops), 200

@app.route('/api/shop/<shop_id>/status', methods=['PUT'])
def toggle_shop_status(shop_id):
    """Toggle shop online/offline status"""
    data = request.get_json()
    shops = read_shops()
    
    if shop_id not in shops:
        return jsonify({"error": "Shop not found"}), 404
    
    is_live = data.get('isLive')
    if is_live is None:
        return jsonify({"error": "isLive parameter required"}), 400
    
    shops[shop_id]['isLive'] = bool(is_live)
    write_shops(shops)
    
    return jsonify({
        "message": "Shop status updated successfully",
        "isLive": shops[shop_id]['isLive']
    }), 200

# ============== Wallet Endpoints ==============
@app.route('/api/wallet/<user_id>', methods=['GET'])
def get_wallet(user_id):
    wallets = read_wallets()
    if user_id in wallets:
        wallet = get_or_create_wallet(wallets, user_id)
        write_wallets(wallets)
        return jsonify({"balance": wallet['balance']}), 200
    return jsonify({"error": "Wallet not found"}), 404

@app.route('/api/wallet/<user_id>/transactions', methods=['GET'])
def get_wallet_transactions(user_id):
    wallets = read_wallets()
    if user_id not in wallets:
        return jsonify({"error": "Wallet not found"}), 404

    wallet = get_or_create_wallet(wallets, user_id)
    transactions = sorted(
        wallet.get('transactions', []),
        key=lambda tx: tx.get('created_at', 0),
        reverse=True
    )
    return jsonify({"transactions": transactions[:20]}), 200

@app.route('/api/wallet/topup/initiate', methods=['POST'])
def initiate_wallet_topup():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    amount = data.get('amount')

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        parsed_amount = round_currency(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount"}), 400

    if parsed_amount < MIN_TOPUP_AMOUNT or parsed_amount > MAX_TOPUP_AMOUNT:
        return jsonify({
            "error": f"Amount must be between {MIN_TOPUP_AMOUNT:.0f} and {MAX_TOPUP_AMOUNT:.0f} INR"
        }), 400

    users = read_users()
    user = users.get(user_id)
    if not user or user.get('role') != 'student':
        return jsonify({"error": "Invalid student user"}), 404

    wallets = read_wallets()
    wallet = get_or_create_wallet(wallets, user_id)

    now = int(time.time())
    merchant_upi_id = "easyprint@upi"
    transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
    expires_at = now + TOPUP_EXPIRY_SECONDS

    transaction = {
        "transaction_id": transaction_id,
        "user_id": user_id,
        "type": "topup",
        "status": "pending",
        "amount_inr": parsed_amount,
        "coins_credited": parsed_amount,
        "conversion_rate": "1 INR = 1 EP-Coin",
        "merchant_upi_id": merchant_upi_id,
        "created_at": now,
        "expires_at": expires_at,
        "updated_at": now
    }

    wallet['transactions'].append(transaction)
    write_wallets(wallets)

    upi_link = (
        f"upi://pay?pa={merchant_upi_id}"
        f"&pn=EasyPrint&am={parsed_amount:.2f}"
        f"&cu=INR&tn={transaction_id}"
    )

    return jsonify({
        "transaction_id": transaction_id,
        "status": "pending",
        "amount_inr": parsed_amount,
        "coins_to_credit": parsed_amount,
        "conversion_rate": "1 INR = 1 EP-Coin",
        "merchant_upi_id": merchant_upi_id,
        "upi_link": upi_link,
        "expires_at": expires_at
    }), 200

@app.route('/api/wallet/topup/complete', methods=['POST'])
def complete_wallet_topup():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    transaction_id = data.get('transaction_id')
    action = data.get('action', 'success')

    valid_actions = {'success', 'failed', 'cancelled'}
    if action not in valid_actions:
        return jsonify({"error": "Invalid action. Use success, failed or cancelled"}), 400

    if not user_id or not transaction_id:
        return jsonify({"error": "user_id and transaction_id are required"}), 400

    wallets = read_wallets()
    if user_id not in wallets:
        return jsonify({"error": "Wallet not found"}), 404

    wallet = get_or_create_wallet(wallets, user_id)
    transaction = find_wallet_transaction(wallet, transaction_id)
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    now = int(time.time())
    if transaction.get('type') != 'topup':
        return jsonify({"error": "Invalid transaction type"}), 400

    current_status = transaction.get('status')
    if current_status == 'success':
        return jsonify({
            "message": "Transaction already completed",
            "status": "success",
            "balance": wallet['balance']
        }), 200
    if current_status in {'failed', 'cancelled', 'expired'}:
        return jsonify({
            "message": "Transaction already closed",
            "status": current_status,
            "balance": wallet['balance']
        }), 200

    if now > int(transaction.get('expires_at', now)):
        transaction['status'] = 'expired'
        transaction['updated_at'] = now
        write_wallets(wallets)
        return jsonify({
            "error": "Transaction expired. Please start again.",
            "status": "expired"
        }), 410

    transaction['status'] = action
    transaction['updated_at'] = now
    transaction['completed_at'] = now

    if action == 'success':
        coins = round_currency(transaction.get('coins_credited', transaction.get('amount_inr', 0)))
        wallet['balance'] = round_currency(wallet.get('balance', 0) + coins)
        write_wallets(wallets)
        return jsonify({
            "message": "Top-up successful",
            "status": "success",
            "coins_added": coins,
            "balance": wallet['balance']
        }), 200

    write_wallets(wallets)
    return jsonify({
        "message": f"Top-up marked as {action}",
        "status": action,
        "balance": wallet['balance']
    }), 200

# ============== Order Endpoints ==============
@app.route('/api/orders/create', methods=['POST'])
def create_order():
    if 'files' not in request.files:
        return jsonify({"error": "No files part"}), 400
    
    files = request.files.getlist('files')
    config_str = request.form.get('config')
    
    # Legacy guest flow
    student_name = request.form.get('studentName')
    session_id = request.form.get('sessionId')

    # New registered user flow
    user_id = request.form.get('userId')
    
    # Shop selection
    shop_id = request.form.get('shopId')
    
    if not shop_id:
        return jsonify({"error": "No shop selected"}), 400

    if not config_str:
        return jsonify({"error": "No config part"}), 400
    
    if not (student_name and session_id) and not user_id:
        return jsonify({"error": "Missing user identification"}), 400

    config = json.loads(config_str)
    order_id = "order_" + str(int(time.time()))

    # --- Wallet & Cost Calculation ---
    if user_id:
        # Get selected shop pricing
        shops = read_shops()
        if shop_id not in shops:
            return jsonify({"error": "Shop not found"}), 404
            
        shop_pricing = shops[shop_id].get('pricing', {"bw": 1, "color": 5})
        
        total_cost = 0
        for file_config in config:
            # Use pre-calculated cost from frontend if available
            if 'estimatedCost' in file_config:
                total_cost += file_config['estimatedCost']
            else:
                # Fallback: calculate based on bwPages and colorPagesCount
                bw_pages = file_config.get('bwPages', 0)
                color_pages = file_config.get('colorPagesCount', 0)
                copies = file_config.get('copies', 1)
                
                # If new format not available, use old calculation
                if bw_pages == 0 and color_pages == 0:
                    page_count = file_config.get('pageCount', 0)
                    total_cost += page_count * shop_pricing['bw'] * copies
                else:
                    total_cost += (bw_pages * shop_pricing['bw']) + (color_pages * shop_pricing['color'])

        wallets = read_wallets()
        wallet = get_or_create_wallet(wallets, user_id)
        current_balance = round_currency(wallet.get('balance', 0))
        
        if current_balance < total_cost:
            return jsonify({
                "error": f"Insufficient EP-Coin balance. Required: {total_cost}, Available: {current_balance}"
            }), 402
        
        wallets[user_id]['balance'] = round_currency(current_balance - total_cost)
        write_wallets(wallets)

    # --- Simple File Processing: Save each file as PDF ---
    saved_files = []
    for idx, file in enumerate(files):
        if file.filename == '':
            continue
        
        original_filename = secure_filename(file.filename)
        file_ext = os.path.splitext(original_filename)[1].lower()
        pdf_filename = f"{order_id}_file{idx+1}.pdf"
        pdf_path = os.path.join(app.config['PROCESSED_FOLDER'], pdf_filename)
        
        if file_ext in ['.png', '.jpg', '.jpeg']:
            # Save image as PDF
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
            file.save(temp_path)
            img = Image.open(temp_path)
            img.convert('RGB').save(pdf_path)
            os.remove(temp_path)
        elif file_ext == '.pdf':
            # Save PDF directly
            file.save(pdf_path)
        elif file_ext == '.docx':
            # Simple placeholder for DOCX
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
            file.save(temp_path)
            c = canvas.Canvas(pdf_path, pagesize=letter)
            c.drawString(100, 750, f"Document: {original_filename}")
            c.save()
            os.remove(temp_path)
        else:
            # Unsupported format - skip
            continue
            
        saved_files.append({
            "pdf_filename": pdf_filename,
            "original_name": original_filename,
            "config": config[idx] if idx < len(config) else {}
        })

    # --- Save Order ---
    orders = read_db()
    order_data = {
        "order_id": order_id,
        "files": saved_files,
        "status": "Pending",
        "order_time": time.time(),
        "shop_id": shop_id  # Associate order with specific shop
    }
    if user_id:
        users = read_users()
        order_data["user_id"] = user_id
        order_data["student_name"] = users.get(user_id, {}).get('username', 'N/A')
    else:
        order_data["student_name"] = student_name
        order_data["session_id"] = session_id

    orders[order_id] = order_data
    write_db(orders)

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 200

@app.route('/api/orders/shop-view', methods=['GET'])
def shop_view():
    """Get orders for a specific shop"""
    shop_id = request.args.get('shop_id')
    if not shop_id:
        return jsonify({"error": "shop_id parameter required"}), 400
    
    orders = read_db()
    # Filter orders by shop_id
    shop_orders = [order for order in orders.values() if order.get('shop_id') == shop_id]
    return jsonify(shop_orders), 200

@app.route('/api/orders/<order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    status_data = request.get_json()
    if not status_data or 'status' not in status_data:
        return jsonify({"error": "Missing status"}), 400

    new_status = status_data['status']
    orders = read_db()
    if order_id in orders:
        orders[order_id]['status'] = new_status
        write_db(orders)
        return jsonify({"message": "Status updated successfully"}), 200
    return jsonify({"error": "Order not found"}), 404

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    orders = read_db()
    if order_id in orders:
        return jsonify(orders[order_id]), 200
    return jsonify({"error": "Order not found"}), 404

@app.route('/api/orders/<order_id>/cancel', methods=['POST'])
def cancel_order(order_id):
    """Cancel an order with time and status validation"""
    data = request.get_json() or {}
    user_id = data.get('user_id')
    session_id = data.get('session_id')
    
    # Must provide either user_id or session_id
    if not user_id and not session_id:
        return jsonify({"error": "user_id or session_id required"}), 400
    
    orders = read_db()
    if order_id not in orders:
        return jsonify({"error": "Order not found"}), 404
    
    order = orders[order_id]
    
    # Verify ownership
    order_user_id = order.get('user_id')
    order_session_id = order.get('session_id')
    
    if user_id:
        if not order_user_id or order_user_id != user_id:
            return jsonify({"error": "Order does not belong to this user"}), 403
    elif session_id:
        if not order_session_id or order_session_id != session_id:
            return jsonify({"error": "Order does not belong to this session"}), 403
    
    # Check if already cancelled
    if order.get('status') == 'Cancelled':
        return jsonify({"error": "Order already cancelled"}), 400
    
    # Check if order status allows cancellation
    current_status = order.get('status', '').lower()
    if current_status in ['in progress', 'ready for pickup', 'completed']:
        return jsonify({
            "error": f"Cannot cancel order with status '{order.get('status')}'. Only pending orders can be cancelled."
        }), 400
    
    # Check time limit
    order_time = order.get('order_time', 0)
    current_time = int(time.time())
    elapsed_seconds = current_time - order_time
    
    # Time limits: 5 minutes (300s) for logged users, 1 minute (60s) for guests
    if user_id:
        time_limit = 300  # 5 minutes
        time_limit_text = "5 minutes"
    else:
        time_limit = 60  # 1 minute
        time_limit_text = "1 minute"
    
    if elapsed_seconds > time_limit:
        return jsonify({
            "error": f"Cancellation window expired. Orders can only be cancelled within {time_limit_text} of placement.",
            "elapsed_seconds": elapsed_seconds,
            "time_limit": time_limit
        }), 410
    
    # Refund coins for logged-in users
    refund_amount = 0
    if user_id:
        # Calculate refund amount
        config = order.get('files', [])
        shops = read_shops()
        shop_id = order.get('shop_id')
        
        if shop_id and shop_id in shops:
            shop_pricing = shops[shop_id].get('pricing', {"bw": 1, "color": 5})
        else:
            shop_pricing = {"bw": 1, "color": 5}
        
        for file_config in config:
            if isinstance(file_config, dict):
                file_data = file_config.get('config', file_config)
                if 'estimatedCost' in file_data:
                    refund_amount += file_data['estimatedCost']
                else:
                    # Fallback calculation
                    bw_pages = file_data.get('bwPages', 0)
                    color_pages = file_data.get('colorPagesCount', 0)
                    copies = file_data.get('copies', 1)
                    refund_amount += (bw_pages * shop_pricing['bw'] + color_pages * shop_pricing['color']) * copies
        
        # Refund to wallet
        if refund_amount > 0:
            wallets = read_wallets()
            wallet = get_or_create_wallet(wallets, user_id)
            wallet['balance'] = round_currency(wallet.get('balance', 0) + refund_amount)
            
            # Add transaction record
            now = int(time.time())
            refund_transaction = {
                "transaction_id": f"refund_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "refund",
                "status": "success",
                "amount_inr": 0,
                "coins_credited": refund_amount,
                "order_id": order_id,
                "reason": "Order cancelled",
                "created_at": now,
                "updated_at": now
            }
            wallet['transactions'].append(refund_transaction)
            write_wallets(wallets)
    
    # Update order status
    order['status'] = 'Cancelled'
    order['cancelled_at'] = current_time
    order['cancellation_reason'] = 'Cancelled by customer'
    write_db(orders)
    
    return jsonify({
        "message": "Order cancelled successfully",
        "order_id": order_id,
        "refund_amount": refund_amount,
        "status": "Cancelled"
    }), 200

@app.route('/api/orders/<order_id>/cancel/shop', methods=['POST'])
def cancel_order_shop(order_id):
    """Shop owner cancels an order with reason"""
    data = request.get_json() or {}
    shop_id = data.get('shop_id')
    cancellation_reason = data.get('cancellation_reason', 'Cancelled by shop')
    
    if not shop_id:
        return jsonify({"error": "shop_id required"}), 400
    
    orders = read_db()
    if order_id not in orders:
        return jsonify({"error": "Order not found"}), 404
    
    order = orders[order_id]
    
    # Verify the order belongs to this shop
    if order.get('shop_id') != shop_id:
        return jsonify({"error": "Order does not belong to this shop"}), 403
    
    # Check if already cancelled
    if order.get('status') == 'Cancelled':
        return jsonify({"error": "Order already cancelled"}), 400
    
    # Check if order is already completed
    if order.get('status') == 'Completed':
        return jsonify({"error": "Cannot cancel completed orders"}), 400
    
    # Calculate refund amount for logged-in users
    refund_amount = 0
    user_id = order.get('user_id')
    
    if user_id:
        # Calculate refund amount
        config = order.get('files', [])
        shops = read_shops()
        
        if shop_id in shops:
            shop_pricing = shops[shop_id].get('pricing', {"bw": 1, "color": 5})
        else:
            shop_pricing = {"bw": 1, "color": 5}
        
        for file_config in config:
            if isinstance(file_config, dict):
                file_data = file_config.get('config', file_config)
                if 'estimatedCost' in file_data:
                    refund_amount += file_data['estimatedCost']
                else:
                    # Fallback calculation
                    bw_pages = file_data.get('bwPages', 0)
                    color_pages = file_data.get('colorPagesCount', 0)
                    copies = file_data.get('copies', 1)
                    refund_amount += (bw_pages * shop_pricing['bw'] + color_pages * shop_pricing['color']) * copies
        
        # Refund to wallet
        if refund_amount > 0:
            wallets = read_wallets()
            wallet = get_or_create_wallet(wallets, user_id)
            wallet['balance'] = round_currency(wallet.get('balance', 0) + refund_amount)
            
            # Add transaction record
            now = int(time.time())
            refund_transaction = {
                "transaction_id": f"refund_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "refund",
                "status": "success",
                "amount_inr": 0,
                "coins_credited": refund_amount,
                "order_id": order_id,
                "reason": f"Order cancelled by shop: {cancellation_reason}",
                "created_at": now,
                "updated_at": now
            }
            wallet['transactions'].append(refund_transaction)
            write_wallets(wallets)
    
    # Update order status
    current_time = int(time.time())
    order['status'] = 'Cancelled'
    order['cancelled_at'] = current_time
    order['cancelled_by'] = 'shop'
    order['cancellation_reason'] = cancellation_reason
    write_db(orders)
    
    return jsonify({
        "message": "Order cancelled successfully by shop",
        "order_id": order_id,
        "refund_amount": refund_amount,
        "status": "Cancelled",
        "cancellation_reason": cancellation_reason
    }), 200

@app.route('/api/orders/user/<session_id>', methods=['GET'])
def get_user_orders(session_id):
    orders = read_db()
    # This now supports both registered user_id and guest session_id
    user_orders = [
        order for order in orders.values() 
        if order.get('session_id') == session_id or order.get('user_id') == session_id
    ]
    return jsonify(user_orders), 200

# ============== Admin Endpoints ==============
@app.route('/api/admin/shops', methods=['GET'])
def get_all_shops():
    # A simple security check - in real life, use a proper auth token system
    auth_header = request.headers.get('Authorization')
    if auth_header != "superadmin:Admin@123":
        return jsonify({"error": "Unauthorized"}), 401
    
    shops = read_shops()
    return jsonify(list(shops.values())), 200

@app.route('/api/admin/shops/<shop_id>/verify', methods=['PUT'])
def verify_shop(shop_id):
    auth_header = request.headers.get('Authorization')
    if auth_header != "superadmin:Admin@123":
        return jsonify({"error": "Unauthorized"}), 401

    shops = read_shops()
    if shop_id in shops:
        shops[shop_id]['status'] = 'Active'
        write_shops(shops)
        return jsonify({"message": "Shop verified successfully"}), 200
    return jsonify({"error": "Shop not found"}), 404

@app.route('/api/admin/shops/<shop_id>/pricing', methods=['PUT'])
def update_pricing(shop_id):
    auth_header = request.headers.get('Authorization')
    if auth_header != "superadmin:Admin@123": # Should be shop owner or admin
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    shops = read_shops()
    if shop_id in shops:
        shops[shop_id]['pricing'] = data.get('pricing', shops[shop_id]['pricing'])
        write_shops(shops)
        return jsonify({"message": "Pricing updated successfully"}), 200
    return jsonify({"error": "Shop not found"}), 404

@app.route('/api/shop/<shop_id>/pricing', methods=['PUT'])
def update_shop_pricing(shop_id):
    """Allow shop owner to update their own pricing"""
    data = request.get_json()
    shops = read_shops()
    
    if shop_id not in shops:
        return jsonify({"error": "Shop not found"}), 404
    
    pricing = data.get('pricing')
    if not pricing:
        return jsonify({"error": "Missing pricing data"}), 400
    
    shops[shop_id]['pricing'] = {
        "bw": float(pricing.get('bw', shops[shop_id]['pricing']['bw'])),
        "color": float(pricing.get('color', shops[shop_id]['pricing']['color']))
    }
    write_shops(shops)
    return jsonify({"message": "Pricing updated successfully", "pricing": shops[shop_id]['pricing']}), 200

@app.route('/processed/<filename>')
def processed_file(filename):
    return send_from_directory(app.config['PROCESSED_FOLDER'], filename)

@app.route('/pfp/<filename>')
def pfp_file(filename):
    return send_from_directory(app.config['PFP_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
