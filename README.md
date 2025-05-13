# SvDesignPattern - Dynamic Device Data Service

## Overview

SvDesignPattern is a proof of concept (PoC) demonstrating an advanced pattern for retrieving device data from different database tables based on device type. This project showcases a flexible and scalable architecture for IoT device data management using SvelteKit, Supabase, and TypeScript.

## Problem Statement

In IoT systems with diverse device types, each device type may store its data in different database tables. Traditional approaches often lead to:

1. Tight coupling between application code and database schema
2. Code duplication when handling different device types
3. Scalability issues when adding new device types
4. Performance challenges with large datasets

## Solution

This PoC implements an abstraction layer that dynamically determines where to fetch device data based on device type configuration. The key components include:

- **Device Type Configuration**: Each device type specifies its `data_table_v2` value, indicating which table contains its data
- **DeviceDataService**: A service that dynamically queries the appropriate table based on device type
- **Optimized Query Strategies**: Different query approaches for different table sizes and types
- **Error Resilience**: Graceful fallbacks and timeout handling to ensure API stability

## Key Features

- **Dynamic Data Retrieval**: Fetch device data from any table without changing application code
- **Performance Optimization**: Special handling for large tables with optimized queries and indexes
- **Error Handling**: Graceful degradation when timeouts or errors occur
- **IoC Container**: Dependency injection for testable and maintainable code
- **Type Safety**: Full TypeScript implementation with strong typing

## Technical Stack

- **Frontend**: SvelteKit
- **Backend**: Node.js with SvelteKit endpoints
- **Database**: Supabase (PostgreSQL)
- **Dependency Injection**: InversifyJS
- **Testing**: Vitest
- **Internationalization**: Paraglide

## Getting Started

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Set up your Supabase project and add credentials to `.env`
4. Run database migrations in the `supabase/migrations` directory
5. Start the development server with `pnpm dev`

## Use Cases

This pattern is particularly valuable for:

- IoT platforms with diverse sensor types
- Systems where data schemas evolve over time
- Applications requiring high performance with large datasets
- Projects that need to scale with minimal code changes

## Lessons Learned

- Dynamically selecting data sources based on configuration provides great flexibility
- Performance optimization is crucial when dealing with large IoT datasets
- Implementing proper error handling and fallback strategies ensures system resilience
- Using stored procedures for complex queries improves database performance

## Future Enhancements

- Add caching layer for frequently accessed data
- Implement real-time data subscriptions using Supabase realtime
- Create a configuration UI for managing device types and their data mappings
- Expand analytics capabilities with aggregated data views
