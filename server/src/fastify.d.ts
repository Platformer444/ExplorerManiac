import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: string,
            username: string,
            display_name: string,
            created_at: Date
        } | null
    }
}