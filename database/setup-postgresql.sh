#!/bin/bash

# =====================================================
# Hotel Ordering System - PostgreSQL Setup Script
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="hotel_ordering_system"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}Hotel Ordering System - PostgreSQL Setup${NC}"
echo -e "${BLUE}======================================================${NC}"

# Function to check if PostgreSQL is running
check_postgresql() {
    echo -e "${YELLOW}Checking PostgreSQL service...${NC}"
    if ! pg_isready -h $DB_HOST -p $DB_PORT >/dev/null 2>&1; then
        echo -e "${RED}Error: PostgreSQL is not running or not accessible${NC}"
        echo -e "${YELLOW}Please start PostgreSQL service and try again${NC}"
        echo -e "${YELLOW}On macOS: brew services start postgresql${NC}"
        echo -e "${YELLOW}On Ubuntu: sudo systemctl start postgresql${NC}"
        echo -e "${YELLOW}On Windows: Start PostgreSQL service from Services${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
}

# Function to check if database exists
database_exists() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME
}

# Function to create database
create_database() {
    echo -e "${YELLOW}Creating database: $DB_NAME${NC}"
    if database_exists; then
        echo -e "${YELLOW}Database $DB_NAME already exists${NC}"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Dropping existing database...${NC}"
            dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
            echo -e "${YELLOW}Creating new database...${NC}"
            createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
            echo -e "${GREEN}✓ Database recreated${NC}"
        else
            echo -e "${YELLOW}Using existing database${NC}"
        fi
    else
        createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        echo -e "${GREEN}✓ Database created${NC}"
    fi
}

# Function to run SQL schema
run_schema() {
    echo -e "${YELLOW}Running PostgreSQL schema...${NC}"
    if [ -f "database/postgresql-schema.sql" ]; then
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/postgresql-schema.sql
        echo -e "${GREEN}✓ Schema applied successfully${NC}"
    else
        echo -e "${RED}Error: database/postgresql-schema.sql not found${NC}"
        echo -e "${YELLOW}Please make sure you're running this script from the project root${NC}"
        exit 1
    fi
}

# Function to verify installation
verify_installation() {
    echo -e "${YELLOW}Verifying installation...${NC}"
    
    # Check tables
    TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    echo -e "${GREEN}✓ Tables created: $TABLE_COUNT${NC}"
    
    # Check sample data
    USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM users;")
    MENU_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM menu_items;")
    COMPANY_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM companies;")
    
    echo -e "${GREEN}✓ Sample users: $USER_COUNT${NC}"
    echo -e "${GREEN}✓ Sample menu items: $MENU_COUNT${NC}"
    echo -e "${GREEN}✓ Sample companies: $COMPANY_COUNT${NC}"
}

# Function to show connection info
show_connection_info() {
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}Database Connection Information${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${YELLOW}Host:${NC} $DB_HOST"
    echo -e "${YELLOW}Port:${NC} $DB_PORT"
    echo -e "${YELLOW}Database:${NC} $DB_NAME"
    echo -e "${YELLOW}User:${NC} $DB_USER"
    echo ""
    echo -e "${YELLOW}Connection String:${NC}"
    echo "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo -e "${YELLOW}Environment Variables for .env:${NC}"
    echo "DB_HOST=$DB_HOST"
    echo "DB_PORT=$DB_PORT"
    echo "DB_NAME=$DB_NAME"
    echo "DB_USER=$DB_USER"
    echo "DB_PASSWORD=your_password_here"
}

# Function to show sample credentials
show_sample_credentials() {
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}Sample User Credentials${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${YELLOW}All sample users have password:${NC} password123"
    echo ""
    echo -e "${GREEN}Server Account:${NC}"
    echo "  Email: server@hotel.com"
    echo "  Role: Server"
    echo ""
    echo -e "${GREEN}Kitchen Account:${NC}"
    echo "  Email: kitchen@hotel.com"
    echo "  Role: Kitchen Staff"
    echo ""
    echo -e "${GREEN}Admin Account:${NC}"
    echo "  Email: admin@hotel.com"
    echo "  Role: Administrator"
}

# Main execution
main() {
    echo -e "${YELLOW}Starting PostgreSQL setup...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: Please run this script from the project root directory${NC}"
        exit 1
    fi
    
    # Run setup steps
    check_postgresql
    create_database
    run_schema
    verify_installation
    
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}✓ PostgreSQL Setup Complete!${NC}"
    echo -e "${GREEN}======================================================${NC}"
    
    show_connection_info
    show_sample_credentials
    
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo -e "${YELLOW}1.${NC} Update your .env file with database credentials"
    echo -e "${YELLOW}2.${NC} Install dependencies: npm install && cd server && npm install"
    echo -e "${YELLOW}3.${NC} Start the application: npm run dev:full"
    echo -e "${YELLOW}4.${NC} Open http://localhost:5173 in your browser"
    echo ""
    echo -e "${GREEN}🎉 Your Hotel Ordering System is ready!${NC}"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --verify       Only verify the installation"
        echo "  --info         Show connection information"
        echo ""
        echo "This script will:"
        echo "  1. Check PostgreSQL service"
        echo "  2. Create/recreate the database"
        echo "  3. Run the schema script"
        echo "  4. Verify the installation"
        exit 0
        ;;
    --verify)
        check_postgresql
        verify_installation
        exit 0
        ;;
    --info)
        show_connection_info
        show_sample_credentials
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac