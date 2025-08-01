import React from 'react';
import { Skeleton } from '@mantine/core'; // Adjust the import based on your library

const LoadingSkeleton = () => (
  <div className="p-4" style={{ paddingTop: '50px' }}>
    <Skeleton height={50} circle mb="xl" />
    <Skeleton height={40} radius="md" mb="xl" />
    <Skeleton height={20} radius="xl" mb="md" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="70%" mb="xl" />

    <Skeleton height={30} radius="md" mb="lg" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="80%" mb="xl" />

    <Skeleton height={30} radius="md" mb="lg" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="60%" mb="xl" />

    <Skeleton height={30} radius="md" mb="lg" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="60%" mb="xl" />

    <Skeleton height={30} radius="md" mb="lg" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="60%" mb="xl" />

    <Skeleton height={30} radius="md" mb="lg" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" mb="sm" />
    <Skeleton height={8} radius="xl" width="60%" mb="xl" />
  </div>
);

export default LoadingSkeleton;
