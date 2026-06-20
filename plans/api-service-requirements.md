# Product Lookup Service

The goal is to design and build a maintainable backend service that balances simplicity with production-readiness.

## Requirements

Build a service that allows clients to:

- Create a product

- Retrieve a product by ID

- List products with pagination

- Search products by name

- Persist products in a database

The service should expose a REST API and store data in a relational or document database.

## Product Definition

A product should contain the following fields:

| **Field**   | **Type**  | **Required** | **Notes**                             |
| ----------- | --------- | ------------ | ------------------------------------- |
| id          | UUID/ULID | Yes          | System-generated unique identifier |
| sku         | String    | Yes          | Unique business identifier            |
| name        | String    | Yes          | Product name                          |
| description | String    | No           | Product description                   |
| category    | String    | Yes          | Product category                      |
| price       | Decimal   | Yes          | Positive monetary value               |
| currency    | String    | Yes          | ISO-4217 currency code                |
| status      | Enum      | Yes          | ACTIVE or INACTIVE                    |
| created_at  | Timestamp | Yes          | System-generated                      |
| updated_at  | Timestamp | Yes          | System-generated                      |

Example:

```json
{
  "id": "prd_01J9Y7Y7NQ7R4X1V5B3K8M6T9A",
  "sku": "IPH15-BLK-128",
  "name": "Apple iPhone 15",
  "description": "128GB Black",
  "category": "Electronics",
  "price": 999.99,
  "currency": "EUR",
  "status": "ACTIVE",
  "created_at": "2026-06-12T10:30:00Z",
  "updated_at": "2026-06-12T10:30:00Z"
}
```

## API Endpoints

## Create Product

None POST /api/v1/products

Request:

```json
{
  "sku": "IPH15-BLK-128",
  "name": "Apple iPhone 15",
  "description": "128GB Black",
  "category": "Electronics",
  "price": 999.99,
  "currency": "EUR"
}
```

## Response

```json
{
  "id": "prd_01J9Y7Y7NQ7R4X1V5B3K8M6T9A",
  "sku": "IPH15-BLK-128",
  "name": "Apple iPhone 15",
  "description": "128GB Black",
  "category": "Electronics",
  "price": 999.99,
  "currency": "EUR",
  "status": "ACTIVE",
  "created_at": "2026-06-12T10:30:00Z",
  "updated_at": "2026-06-12T10:30:00Z"
}
```

## Retrieve Product

None

GET /api/v1/products/{id}

## List Products

None GET /api/v1/products?page=1&page_size=20

## Supported query parameters

| **Parameter** | **Description**                            |
| ------------- | ------------------------------------------ |
| page          | Page number                                |
| page_size     | Number of results per page                 |
| category      | Filter by category                         |
| status        | Filter by status                           |
| search        | Case-insensitive search by product name |

Example:

None GET /api/v1/products?search=iphone&page=1&page_size=20

Response:

```json
{
  "data": [
    {
      "id": "prd_01J9Y7Y7NQ7R4X1V5B3K8M6T9A",
      "sku": "IPH15-BLK-128",
      "name": "Apple iPhone 15",
      "category": "Electronics",
      "price": 999.99,
      "currency": "EUR",
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 157,
    "total_pages": 8
  }
}
```

## Expectations

The implementation should be simple but demonstrate sound engineering practices. We expect:

### API Design

- Clear request and response contracts

- Appropriate HTTP status codes

- Consistent error handling

- Input validation

### Data Persistence

- Database-backed implementation

- Database schema definition

- Migration strategy

### Testing

- Unit tests

- Basic integration tests

### Production Readiness

While we do not expect full production infrastructure, please consider:

- Layered architecture (handler/service/repository)

- Structured logging

- Configuration via environment variables

- Health endpoint

- Docker support

- OpenAPI/Swagger documentation

- Database indexes for common queries

- Pagination limits to prevent abuse

### Easy to locally run for development

- Use docker file for dev that has both db and server

- Make sure it has seed for the database and proper migrations

### Documentation

The repository should include a README describing:

- Architecture and design decisions

- How to run the application locally

- How to run tests

- Database schema

- API examples

- Pagination strategy

- Tradeoffs and assumptions

- What you would improve before deploying this service to production
