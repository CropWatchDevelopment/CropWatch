// @ts-nocheck
import type { SupabaseClient, PostgrestResponse } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase client for testing
 * @param mockData Mock data to return from queries
 * @returns A mock Supabase client
 */
export function createMockSupabaseClient(mockData: any = {}): SupabaseClient {
	const mockFrom = (tableName: string) => {
		const tableData = mockData[tableName] || [];

		// Build the query object with chainable methods
		const query = {
			select: (columns: string = '*') => {
				return {
					...query,
					eq: (column: string, value: any) => {
						const filteredData = tableData.filter((item: any) => item[column] === value);
						return {
							...query,
							single: () => mockResponse(filteredData[0]),
							limit: () => ({
								single: () => mockResponse(filteredData[0])
							}),
							order: () => ({
								limit: () => ({
									single: () => mockResponse(filteredData[0])
								})
							}),
							data: filteredData
						};
					},
					gte: () => query,
					lte: () => query,
					order: () => query,
					limit: () => query,
					single: () => mockResponse(tableData[0]),
					data: tableData
				};
			},
			insert: (data: any) => {
				const newItem = { ...data };
				return {
					select: () => ({
						single: () => mockResponse(newItem)
					})
				};
			},
			update: (data: any) => {
				return {
					eq: (column: string, value: any) => {
						const index = tableData.findIndex((item: any) => item[column] === value);
						const updatedItem = index >= 0 ? { ...tableData[index], ...data } : null;
						return {
							select: () => ({
								single: () => mockResponse(updatedItem)
							})
						};
					}
				};
			},
			delete: () => {
				return {
					eq: () => mockResponse(null)
				};
			}
		};

		return query;
	};

	const mockResponse = <T>(data: T | null): PostgrestResponse<T> => {
		return {
			data,
			error: null,
			count: data ? 1 : 0,
			status: 200,
			statusText: 'OK'
		};
	};

	// Return a partial mock implementation of SupabaseClient
	return {
		from: mockFrom
	} as unknown as SupabaseClient;
}

/**
 * Creates a mock for the Supabase client that simulates errors
 * @param errorCode PostgreSQL error code to simulate
 * @param errorMessage Error message to return
 * @returns A mock Supabase client that returns errors
 */
export function createErrorMockSupabaseClient(
	errorCode: string = '42P01',
	errorMessage: string = 'Mock Error'
): SupabaseClient {
	const mockErrorResponse = <T>(): PostgrestResponse<T> => {
		return {
			data: null,
			error: {
				code: errorCode,
				message: errorMessage,
				details: '',
				hint: ''
			},
			count: null,
			status: 400,
			statusText: 'Bad Request'
		};
	};

	const mockFrom = () => {
		return {
			select: () => ({
				eq: () => ({
					single: () => mockErrorResponse(),
					limit: () => ({
						single: () => mockErrorResponse()
					}),
					order: () => ({
						limit: () => ({
							single: () => mockErrorResponse()
						})
					})
				}),
				single: () => mockErrorResponse()
			}),
			insert: () => ({
				select: () => ({
					single: () => mockErrorResponse()
				})
			}),
			update: () => ({
				eq: () => ({
					select: () => ({
						single: () => mockErrorResponse()
					})
				})
			}),
			delete: () => ({
				eq: () => mockErrorResponse()
			})
		};
	};

	return {
		from: mockFrom
	} as unknown as SupabaseClient;
}
