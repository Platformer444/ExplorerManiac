import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: string,
            username: string,
            display_name: string
        } | null
    }
}