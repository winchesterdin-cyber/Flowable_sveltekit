import { describe, it, expect } from 'vitest';
import type {
  User,
  Task,
  TaskDetails,
  ProcessDefinition,
  ProcessInstance,
  LoginRequest
} from '$lib/types';

describe('Type definitions', () => {
  describe('User', () => {
    it('should accept valid user data', () => {
      const user: User = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        roles: ['ROLE_USER']
      };

      expect(user.username).toBe('testuser');
      expect(user.roles).toContain('ROLE_USER');
    });

    it('should accept missing email', () => {
      const user: User = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        roles: []
      };

      expect(user.email).toBeUndefined();
    });
  });

  describe('Task', () => {
    it('should accept valid task data', () => {
      const task: Task = {
        id: 'task-123',
        name: 'Approve Request',
        description: 'Approve the expense request',
        processInstanceId: 'proc-456',
        processDefinitionId: 'proc-def-789',
        taskDefinitionKey: 'approveRequest',
        processDefinitionKey: 'expense-approval',
        processName: 'Expense Approval',
        assignee: 'supervisor1',
        owner: 'user1',
        createTime: '2024-01-01T10:00:00Z',
        dueDate: '2024-01-05T10:00:00Z',
        priority: 50,
        formKey: 'approval-form',
        variables: { amount: 500, category: 'Travel' },
        businessKey: 'EXP-2024-001'
      };

      expect(task.id).toBe('task-123');
      expect(task.priority).toBe(50);
      expect(task.variables?.amount).toBe(500);
    });

    it('should accept missing optional fields', () => {
      const task: Task = {
        id: 'task-123',
        name: 'Simple Task',
        processInstanceId: 'proc-456',
        processDefinitionId: 'proc-def-789',
        taskDefinitionKey: 'simpleTask',
        processDefinitionKey: 'simple-process',
        processName: 'Simple Process',
        createTime: '2024-01-01T10:00:00Z',
        priority: 0,
        variables: {}
      };

      expect(task.assignee).toBeUndefined();
      expect(task.dueDate).toBeUndefined();
    });
  });

  describe('TaskDetails', () => {
    it('should contain task and variables', () => {
      const taskDetails: TaskDetails = {
        task: {
          id: 'task-123',
          name: 'Test Task',
          processInstanceId: 'proc-456',
          processDefinitionId: 'proc-def-789',
          taskDefinitionKey: 'testTask',
          processDefinitionKey: 'test',
          processName: 'Test Process',
          createTime: '2024-01-01T10:00:00Z',
          priority: 50,
          variables: {}
        },
        variables: {
          customVar: 'value'
        }
      };

      expect(taskDetails.task.id).toBe('task-123');
      expect(taskDetails.variables?.customVar).toBe('value');
    });
  });

  describe('ProcessDefinition', () => {
    it('should accept valid process definition', () => {
      const processDef: ProcessDefinition = {
        id: 'proc-def-123',
        key: 'expense-approval',
        name: 'Expense Approval Process',
        description: 'Handles expense approvals',
        version: 1,
        suspended: false
      };

      expect(processDef.key).toBe('expense-approval');
      expect(processDef.version).toBe(1);
    });
  });

  describe('ProcessInstance', () => {
    it('should accept valid process instance', () => {
      const processInstance: ProcessInstance = {
        id: 'proc-123',
        processDefinitionId: 'proc-def-123',
        processDefinitionKey: 'expense-approval',
        processDefinitionName: 'Expense Approval',
        businessKey: 'EXP-2024-001',
        startTime: '2024-01-01T10:00:00Z',
        startUserId: 'user1',
        variables: { amount: 1000 },
        ended: false,
        suspended: false
      };

      expect(processInstance.id).toBe('proc-123');
      expect(processInstance.ended).toBe(false);
    });
  });

  describe('LoginRequest', () => {
    it('should accept valid login credentials', () => {
      const loginRequest: LoginRequest = {
        username: 'user1',
        password: 'password123'
      };

      expect(loginRequest.username).toBe('user1');
      expect(loginRequest.password).toBe('password123');
    });
  });
});
